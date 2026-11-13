// Banco em chave-valor (Netlify Blobs ou um arquivo local). Mesmas operações do D1,
// sem SQL. O registro de Pix com WhatsApp é a única exceção que guarda contato,
// e só com o consentimento gravado no próprio registro.
import {
  CONFIG_PADRAO,
  ETAPAS,
  VARIANTE_PADRAO,
  type Banco,
  type Config,
  type Etapa,
  type PixRecuperacao,
} from "./banco";

export interface Kv {
  get(chave: string): Promise<string | null>;
  set(chave: string, valor: string): Promise<void>;
  del(chave: string): Promise<void>;
  list(prefixo: string): Promise<string[]>;
}

const zerado = () => Object.fromEntries(ETAPAS.map((e) => [e, 0])) as Record<Etapa, number>;

const horaDe = (d: Date) => d.toISOString().slice(0, 13);

export class BancoKv implements Banco {
  constructor(private readonly kv: Kv) {}

  async registrarAcesso(ip: string, metodo: string, rota: string, status: number, quando: Date) {
    const id = `${quando.toISOString()}-${crypto.randomUUID()}`;
    await this.kv.set(`acesso/${id}`, JSON.stringify({ ip, metodo, rota, status, quando: quando.toISOString() }));
    const taxa = `taxa/${rota}/${ip}/${horaDe(quando)}`;
    const n = Number((await this.kv.get(taxa)) ?? "0");
    await this.kv.set(taxa, String(n + 1));
  }

  async contarAcessos(ip: string, rota: string, desde: Date) {
    let total = 0;
    const fim = Date.now();
    for (let t = desde.getTime(); t <= fim + 3600_000; t += 3600_000) {
      const n = Number((await this.kv.get(`taxa/${rota}/${ip}/${horaDe(new Date(t))}`)) ?? "0");
      total += n;
      if (t - desde.getTime() > 6 * 3600_000) break;
    }
    return total;
  }

  private chaveContador(dia: string, etapa: string, utm: string, variante: string) {
    return `cont/${dia}/${etapa}/${encodeURIComponent(utm)}/${variante}`;
  }

  async incrementar(dia: string, etapa: Etapa, utmCampaign: string, variante = VARIANTE_PADRAO) {
    const k = this.chaveContador(dia, etapa, utmCampaign, variante);
    const n = Number((await this.kv.get(k)) ?? "0");
    await this.kv.set(k, String(n + 1));
  }

  async marcarPagamentoContado(pagamentoId: string, quando: Date) {
    const k = `pago/${pagamentoId}`;
    if (await this.kv.get(k)) return false;
    await this.kv.set(k, quando.toISOString());
    return true;
  }

  async contadores(de: string, ate: string, utmCampaign?: string, variante?: string) {
    const saida = zerado();
    for (const k of await this.kv.list("cont/")) {
      const partes = k.split("/");
      const dia = partes[1] ?? "";
      const etapa = partes[2] as Etapa;
      const utm = decodeURIComponent(partes[3] ?? "");
      const v = partes[4] ?? "";
      if (dia < de || dia > ate) continue;
      if (utmCampaign && utm !== utmCampaign) continue;
      if (variante && v !== variante) continue;
      if (!(etapa in saida)) continue;
      saida[etapa] += Number((await this.kv.get(k)) ?? "0");
    }
    return saida;
  }

  async somarReceita(dia: string, utmCampaign: string, variante: string, centavos: number) {
    const k = `receita/${dia}/${encodeURIComponent(utmCampaign)}/${variante}`;
    const atual = JSON.parse((await this.kv.get(k)) ?? "{\"vendas\":0,\"centavos\":0}") as { vendas: number; centavos: number };
    await this.kv.set(k, JSON.stringify({ vendas: atual.vendas + 1, centavos: atual.centavos + centavos }));
  }

  async receita(de: string, ate: string, utmCampaign?: string, variante?: string) {
    let vendas = 0;
    let cents = 0;
    for (const k of await this.kv.list("receita/")) {
      const partes = k.split("/");
      const dia = partes[1] ?? "";
      const utm = decodeURIComponent(partes[2] ?? "");
      const v = partes[3] ?? "";
      if (dia < de || dia > ate) continue;
      if (utmCampaign && utm !== utmCampaign) continue;
      if (variante && v !== variante) continue;
      const r = JSON.parse((await this.kv.get(k)) ?? "{}") as { vendas?: number; centavos?: number };
      vendas += r.vendas ?? 0;
      cents += r.centavos ?? 0;
    }
    return { vendas, centavos: cents };
  }

  async porVariante(de: string, ate: string) {
    const saida: Record<string, Record<Etapa, number>> = {};
    for (const k of await this.kv.list("cont/")) {
      const partes = k.split("/");
      const dia = partes[1] ?? "";
      const etapa = partes[2] as Etapa;
      const v = partes[4] ?? VARIANTE_PADRAO;
      if (dia < de || dia > ate || !ETAPAS.includes(etapa)) continue;
      (saida[v] ??= zerado())[etapa] += Number((await this.kv.get(k)) ?? "0");
    }
    return saida;
  }

  async gastos(de: string, ate: string) {
    const lista: { dia: string; campanha: string; gasto_cents: number }[] = [];
    for (const k of await this.kv.list("gasto/")) {
      const partes = k.split("/");
      const dia = partes[1] ?? "";
      const campanha = decodeURIComponent(partes[2] ?? "");
      if (dia < de || dia > ate) continue;
      lista.push({ dia, campanha, gasto_cents: Number((await this.kv.get(k)) ?? "0") });
    }
    return lista.sort((a, b) => a.dia.localeCompare(b.dia) || a.campanha.localeCompare(b.campanha));
  }

  async salvarGasto(dia: string, campanha: string, gastoCents: number) {
    await this.kv.set(`gasto/${dia}/${encodeURIComponent(campanha)}`, String(gastoCents));
  }

  async lerConfig() {
    const r = await this.kv.get("cfg/painel");
    return r ? { ...CONFIG_PADRAO, ...(JSON.parse(r) as Partial<Config>) } : { ...CONFIG_PADRAO };
  }

  async salvarConfig(c: Config) {
    await this.kv.set("cfg/painel", JSON.stringify(c));
  }

  async lerValor(chave: string) {
    return this.kv.get(`cfg/${chave}`);
  }

  async gravarValor(chave: string, valor: string) {
    await this.kv.set(`cfg/${chave}`, valor);
  }

  async salvarPixRecuperacao(p: PixRecuperacao) {
    const anterior = await this.lerPixId(p.pagamento_id);
    if (anterior && anterior.token !== p.token) await this.kv.del(`tok/${anterior.token}`);
    await this.kv.set(`pix/${p.pagamento_id}`, JSON.stringify(p));
    await this.kv.set(`tok/${p.token}`, p.pagamento_id);
  }

  private async lerPixId(id: string) {
    const bruto = await this.kv.get(`pix/${id}`);
    return bruto ? (JSON.parse(bruto) as PixRecuperacao) : null;
  }

  async listarPixPendentes() {
    const lista: PixRecuperacao[] = [];
    for (const k of await this.kv.list("pix/")) {
      const bruto = await this.kv.get(k);
      if (!bruto) continue;
      const p = JSON.parse(bruto) as PixRecuperacao;
      if (p.status === "pendente") lista.push(p);
    }
    return lista.sort((a, b) => b.criado_em.localeCompare(a.criado_em)).slice(0, 200);
  }

  async lerPixPorToken(token: string) {
    const id = await this.kv.get(`tok/${token}`);
    if (!id) return null;
    return this.lerPixId(id);
  }

  async apagarPixRecuperacao(pagamentoId: string) {
    const p = await this.lerPixId(pagamentoId);
    if (!p) return;
    await this.kv.del(`pix/${pagamentoId}`);
    await this.kv.del(`tok/${p.token}`);
  }

  async limpar(agora: Date) {
    const seisMeses = new Date(agora.getTime());
    seisMeses.setUTCMonth(seisMeses.getUTCMonth() - 6);
    const seteDias = agora.getTime() - 7 * 86400_000;
    const doisDias = agora.getTime() - 2 * 86400_000;
    for (const k of await this.kv.list("acesso/")) {
      const iso = k.slice("acesso/".length, "acesso/".length + 24);
      if (iso < seisMeses.toISOString()) await this.kv.del(k);
    }
    for (const k of await this.kv.list("pago/")) {
      const iso = (await this.kv.get(k)) ?? "";
      if (iso && Date.parse(iso) < seteDias) await this.kv.del(k);
    }
    for (const k of await this.kv.list("pix/")) {
      const p = JSON.parse((await this.kv.get(k)) ?? "null") as PixRecuperacao | null;
      if (p && Date.parse(p.criado_em) < seteDias) {
        await this.kv.del(k);
        await this.kv.del(`tok/${p.token}`);
      }
    }
    for (const k of await this.kv.list("taxa/")) {
      const hora = k.split("/").pop() ?? "";
      if (Date.parse(`${hora}:00:00.000Z`) < doisDias) await this.kv.del(k);
    }
  }
}
