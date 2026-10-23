// Dublês em memória de D1, Mercado Pago e Meta, para testar as rotas sem rede.
import type { Notificador } from "../src/push";
import { ETAPAS, CONFIG_PADRAO, type Banco, type Config, type Etapa } from "../src/banco";
import type { MercadoPago, NovoPix, Pagamento } from "../src/mercadopago";
import type { EventoMeta, Meta } from "../src/meta";
import type { Env } from "../src/env";
import type { Servicos } from "../src/servicos";
import { chavesDoEnv } from "../src/servicos";
import { tratar } from "../src/app";

export class BancoMemoria implements Banco {
  acessos: { ip: string; metodo: string; rota: string; status: number; quando: string }[] = [];
  cont = new Map<string, number>();
  contados = new Set<string>();
  gastosSalvos = new Map<string, number>();
  config: Config = { ...CONFIG_PADRAO };

  async registrarAcesso(ip: string, metodo: string, rota: string, status: number, quando: Date) {
    this.acessos.push({ ip, metodo, rota, status, quando: quando.toISOString() });
  }
  async contarAcessos(ip: string, rota: string, desde: Date) {
    return this.acessos.filter((a) => a.ip === ip && a.rota === rota && a.quando >= desde.toISOString()).length;
  }
  async incrementar(dia: string, etapa: Etapa, utm: string, variante = "v1") {
    const k = `${dia}|${etapa}|${utm}|${variante}`;
    this.cont.set(k, (this.cont.get(k) ?? 0) + 1);
  }
  async marcarPagamentoContado(id: string) {
    if (this.contados.has(id)) return false;
    this.contados.add(id);
    return true;
  }
  async contadores(de: string, ate: string, utm?: string, variante?: string) {
    const out = Object.fromEntries(ETAPAS.map((e) => [e, 0])) as Record<Etapa, number>;
    for (const [k, n] of this.cont) {
      const [dia, etapa, u, v] = k.split("|") as [string, Etapa, string, string];
      if (dia >= de && dia <= ate && (!utm || u === utm) && (!variante || v === variante)) out[etapa] += n;
    }
    return out;
  }
  async porVariante(de: string, ate: string) {
    const out: Record<string, Record<Etapa, number>> = {};
    for (const [k, n] of this.cont) {
      const [dia, etapa, , v] = k.split("|") as [string, Etapa, string, string];
      if (dia < de || dia > ate) continue;
      (out[v] ??= Object.fromEntries(ETAPAS.map((e) => [e, 0])) as Record<Etapa, number>)[etapa] += n;
    }
    return out;
  }
  totalVariante(etapa: Etapa, variante: string) {
    let n = 0;
    for (const [k, v] of this.cont) if (k.split("|")[1] === etapa && k.split("|")[3] === variante) n += v;
    return n;
  }
  async gastos(de: string, ate: string) {
    return [...this.gastosSalvos]
      .map(([k, v]) => ({ dia: k.split("|")[0]!, campanha: k.split("|")[1]!, gasto_cents: v }))
      .filter((g) => g.dia >= de && g.dia <= ate);
  }
  async salvarGasto(dia: string, campanha: string, gasto: number) {
    this.gastosSalvos.set(`${dia}|${campanha}`, gasto);
  }
  valores = new Map<string, string>();
  async lerValor(chave: string) {
    return this.valores.get(chave) ?? null;
  }
  async gravarValor(chave: string, valor: string) {
    this.valores.set(chave, valor);
  }
  async lerConfig() {
    return this.config;
  }
  async salvarConfig(c: Config) {
    this.config = c;
  }
  async limpar() {}
  total(etapa: Etapa) {
    let n = 0;
    for (const [k, v] of this.cont) if (k.split("|")[1] === etapa) n += v;
    return n;
  }
}

export class MercadoPagoFalso implements MercadoPago {
  pagamentos = new Map<string, Pagamento>();
  porIdempotencia = new Map<string, string>();
  criados: NovoPix[] = [];
  falhar = false;
  private proximo = 1000;

  async criarPix(p: NovoPix) {
    if (this.falhar) throw new Error("rede");
    const existente = this.porIdempotencia.get(p.idempotencyKey);
    if (existente) return this.pagamentos.get(existente)!;
    this.criados.push(p);
    const id = String(this.proximo++);
    const pag: Pagamento = {
      id,
      status: "pending",
      status_detail: "pending_waiting_transfer",
      valor: 11.9,
      valor_reembolsado: 0,
      moeda: "BRL",
      external_reference: p.externalReference,
      criado_em: "2026-10-18T12:00:00.000-03:00",
      aprovado_em: null,
      expira_em: p.expiraEm.toISOString(),
      metadata: p.metadata,
      pix: { qr_code: "00020126...", qr_code_base64: "iVBORw0KGgo=", ticket_url: null },
    };
    this.pagamentos.set(id, pag);
    this.porIdempotencia.set(p.idempotencyKey, id);
    return pag;
  }
  async obter(id: string) {
    if (this.falhar) throw new Error("rede");
    return this.pagamentos.get(id) ?? null;
  }
  async buscarAprovadosPorReferencia(ref: string) {
    return [...this.pagamentos.values()].filter((p) => p.external_reference === ref && p.status === "approved").reverse();
  }
  async buscarAprovadosNoPeriodo() {
    return [...this.pagamentos.values()].filter((p) => p.status === "approved");
  }
  aprovar(id: string, quando = "2026-10-18T12:05:00.000-03:00") {
    const p = this.pagamentos.get(id)!;
    p.status = "approved";
    p.status_detail = "accredited";
    p.aprovado_em = quando;
  }
  reembolsar(id: string) {
    const p = this.pagamentos.get(id)!;
    p.status = "refunded";
    p.valor_reembolsado = p.valor;
  }
}

export class MetaFalsa implements Meta {
  eventos: EventoMeta[] = [];
  async enviar(e: EventoMeta) {
    this.eventos.push(e);
  }
}

export const ORIGEM = "https://segredo.exemplo";

export function envTeste(): Env {
  return {
    DB: undefined as unknown as D1Database,
    MP_ACCESS_TOKEN: "TEST-token",
    MP_WEBHOOK_SECRET: "segredo-webhook",
    SEGREDO_CHAVE: "segredo-chave",
    SEGREDO_PASSE: "segredo-passe",
    SEGREDO_SEMENTE: "segredo-semente",
    ADMIN_EMAILS: "rob@exemplo.com",
    CF_ACCESS_AUD: "aud-teste",
    CF_ACCESS_TEAM_DOMAIN: "https://equipe.cloudflareaccess.com",
    PUBLIC_BASE_URL: ORIGEM,
  };
}

export const CHAVE_PAINEL_TESTE = "chave-do-painel-de-teste-123456";

export class PushFalso implements Notificador {
  chave: string | null = "BPublica";
  enviados: string[] = [];
  respostas = new Map<string, number>();
  ligado() {
    return this.chave !== null;
  }
  chavePublica() {
    return this.chave;
  }
  async enviar(endpoint: string) {
    this.enviados.push(endpoint);
    return this.respostas.get(endpoint) ?? 201;
  }
}

export function ambiente(agora = new Date("2026-10-18T15:00:00Z")) {
  const env = envTeste();
  const banco = new BancoMemoria();
  const mp = new MercadoPagoFalso();
  const meta = new MetaFalsa();
  const push = new PushFalso();
  const pendentes: Promise<unknown>[] = [];
  const relogio = { agora };
  const s: Servicos = {
    env,
    mp,
    meta,
    banco,
    chavesPasse: chavesDoEnv(env),
    access: { equipe: env.CF_ACCESS_TEAM_DOMAIN, aud: env.CF_ACCESS_AUD, emails: env.ADMIN_EMAILS, chaveLink: CHAVE_PAINEL_TESTE },
    push,
    agora: () => relogio.agora,
    depois: (p) => void pendentes.push(p),
  };
  async function chamar(caminho: string, corpo?: unknown, init: RequestInit & { ip?: string } = {}) {
    const headers = new Headers(init.headers);
    if (!headers.has("origin")) headers.set("origin", ORIGEM);
    if (!headers.has("user-agent")) headers.set("user-agent", "Mozilla/5.0 (iPhone) Safari");
    headers.set("cf-connecting-ip", init.ip ?? "203.0.113.7");
    if (corpo !== undefined) headers.set("content-type", "application/json");
    const req = new Request(`https://api.segredo.exemplo${caminho}`, {
      method: init.method ?? "POST",
      headers,
      body: corpo === undefined ? undefined : typeof corpo === "string" ? corpo : JSON.stringify(corpo),
    });
    const resp = await tratar(req, s);
    await Promise.all(pendentes.splice(0));
    const texto = await resp.text();
    const ehJson = resp.headers.get("content-type")?.includes("json");
    return { status: resp.status, headers: resp.headers, corpo: texto && ehJson ? JSON.parse(texto) : null, texto };
  }
  return { s, env, banco, mp, meta, push, chamar, relogio };
}

export const ENTRADAS = {
  nome: "Camila Costa",
  data_nascimento: "1994-03-17",
  tratamento: "ela" as const,
  respostas: [2, 2, 2, 0, 3],
};
