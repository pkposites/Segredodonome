// Acesso ao D1. Só as tabelas de worker/migrations/: nenhum dado de cliente.

export const ETAPAS = [
  "visita", "escolha_nome", "quiz_inicio", "quiz_metade",
  "quiz_passo_1", "quiz_passo_2", "quiz_passo_3", "quiz_passo_4", "quiz_passo_5",
  "quiz_passo_6", "quiz_passo_7", "quiz_passo_8", "quiz_passo_9",
  "resultado_visto", "oferta_vista", "comprar_toque",
  "pix_gerado", "pix_copiado", "pix_pago", "pago_entregue", "pdf_salvo", "casal_interesse",
] as const;
export type Etapa = (typeof ETAPAS)[number];

export interface Config {
  taxa_pix_pct: number;
  imposto_pct: number;
}

export const CONFIG_PADRAO: Config = { taxa_pix_pct: 0, imposto_pct: 0 };

export interface Banco {
  registrarAcesso(ip: string, metodo: string, rota: string, status: number, quando: Date): Promise<void>;
  contarAcessos(ip: string, rota: string, desde: Date): Promise<number>;
  incrementar(dia: string, etapa: Etapa, utmCampaign: string, variante?: string): Promise<void>;
  /** true se o pagamento ainda não tinha sido contado. */
  marcarPagamentoContado(pagamentoId: string, quando: Date): Promise<boolean>;
  contadores(de: string, ate: string, utmCampaign?: string, variante?: string): Promise<Record<Etapa, number>>;
  /** Totais por variante da experiência, para comparar versões no painel. */
  porVariante(de: string, ate: string): Promise<Record<string, Record<Etapa, number>>>;
  gastos(de: string, ate: string): Promise<{ dia: string; campanha: string; gasto_cents: number }[]>;
  salvarGasto(dia: string, campanha: string, gastoCents: number, quando: Date): Promise<void>;
  lerConfig(): Promise<Config>;
  salvarConfig(c: Config): Promise<void>;
  limpar(agora: Date): Promise<void>;
}

/** Dia (AAAA-MM-DD) no fuso de São Paulo. */
export function diaSaoPaulo(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d);
}

export const VARIANTE_PADRAO = "v1";

/** Nome curto da versão da experiência (ex.: "jogo-v2"); qualquer outra coisa vira "v1". */
export function normalizarVariante(v: unknown): string {
  return typeof v === "string" && /^[a-z0-9][a-z0-9.-]{0,31}$/.test(v) ? v : VARIANTE_PADRAO;
}

const zerado = () => Object.fromEntries(ETAPAS.map((e) => [e, 0])) as Record<Etapa, number>;

export function normalizarCampanha(utm: unknown): string {
  if (typeof utm !== "string") return "(sem)";
  const limpo = utm.trim().slice(0, 100);
  // IDs dinâmicos da Meta são numéricos; aceita também nomes simples, nunca texto livre longo.
  return /^[\w.\-]{1,100}$/.test(limpo) ? limpo : "(sem)";
}

export class BancoD1 implements Banco {
  constructor(private readonly db: D1Database) {}

  async registrarAcesso(ip: string, metodo: string, rota: string, status: number, quando: Date) {
    await this.db
      .prepare("INSERT INTO access_logs (ip, ocorrido_em, metodo, rota, status) VALUES (?, ?, ?, ?, ?)")
      .bind(ip, quando.toISOString(), metodo, rota, status)
      .run();
  }

  async contarAcessos(ip: string, rota: string, desde: Date) {
    const r = await this.db
      .prepare("SELECT COUNT(*) AS n FROM access_logs WHERE ip = ? AND rota = ? AND ocorrido_em >= ?")
      .bind(ip, rota, desde.toISOString())
      .first<{ n: number }>();
    return r?.n ?? 0;
  }

  async incrementar(dia: string, etapa: Etapa, utmCampaign: string, variante = VARIANTE_PADRAO) {
    await this.db
      .prepare(
        `INSERT INTO contadores (dia, etapa, utm_campaign, variante, total) VALUES (?, ?, ?, ?, 1)
         ON CONFLICT (dia, etapa, utm_campaign, variante) DO UPDATE SET total = total + 1`,
      )
      .bind(dia, etapa, utmCampaign, variante)
      .run();
  }

  async marcarPagamentoContado(pagamentoId: string, quando: Date) {
    const r = await this.db
      .prepare("INSERT OR IGNORE INTO pagamentos_contados (pagamento_id, contado_em) VALUES (?, ?)")
      .bind(pagamentoId, quando.toISOString())
      .run();
    return (r.meta.changes ?? 0) > 0;
  }

  async contadores(de: string, ate: string, utmCampaign?: string, variante?: string) {
    let sql = "SELECT etapa, SUM(total) AS n FROM contadores WHERE dia BETWEEN ? AND ?";
    const args: string[] = [de, ate];
    if (utmCampaign) (sql += " AND utm_campaign = ?"), args.push(utmCampaign);
    if (variante) (sql += " AND variante = ?"), args.push(variante);
    const { results } = await this.db.prepare(`${sql} GROUP BY etapa`).bind(...args).all<{ etapa: Etapa; n: number }>();
    const saida = zerado();
    for (const r of results) saida[r.etapa] = r.n;
    return saida;
  }

  async porVariante(de: string, ate: string) {
    const { results } = await this.db
      .prepare("SELECT variante, etapa, SUM(total) AS n FROM contadores WHERE dia BETWEEN ? AND ? GROUP BY variante, etapa")
      .bind(de, ate)
      .all<{ variante: string; etapa: Etapa; n: number }>();
    const saida: Record<string, Record<Etapa, number>> = {};
    for (const r of results) (saida[r.variante] ??= zerado())[r.etapa] = r.n;
    return saida;
  }

  async gastos(de: string, ate: string) {
    const { results } = await this.db
      .prepare("SELECT dia, campanha, gasto_cents FROM gasto_midia WHERE dia BETWEEN ? AND ? ORDER BY dia, campanha")
      .bind(de, ate)
      .all<{ dia: string; campanha: string; gasto_cents: number }>();
    return results;
  }

  async salvarGasto(dia: string, campanha: string, gastoCents: number, quando: Date) {
    await this.db
      .prepare(
        `INSERT INTO gasto_midia (dia, campanha, gasto_cents, atualizado_em) VALUES (?, ?, ?, ?)
         ON CONFLICT (dia, campanha) DO UPDATE SET gasto_cents = excluded.gasto_cents, atualizado_em = excluded.atualizado_em`,
      )
      .bind(dia, campanha, gastoCents, quando.toISOString())
      .run();
  }

  async lerConfig() {
    const r = await this.db.prepare("SELECT valor FROM config WHERE chave = 'painel'").first<{ valor: string }>();
    return r ? { ...CONFIG_PADRAO, ...(JSON.parse(r.valor) as Partial<Config>) } : CONFIG_PADRAO;
  }

  async salvarConfig(c: Config) {
    await this.db
      .prepare("INSERT INTO config (chave, valor) VALUES ('painel', ?) ON CONFLICT (chave) DO UPDATE SET valor = excluded.valor")
      .bind(JSON.stringify(c))
      .run();
  }

  async limpar(agora: Date) {
    const seisMeses = new Date(agora.getTime());
    seisMeses.setUTCMonth(seisMeses.getUTCMonth() - 6);
    const seteDias = new Date(agora.getTime() - 7 * 86400_000);
    await this.db.batch([
      this.db.prepare("DELETE FROM access_logs WHERE ocorrido_em < ?").bind(seisMeses.toISOString()),
      this.db.prepare("DELETE FROM pagamentos_contados WHERE contado_em < ?").bind(seteDias.toISOString()),
    ]);
  }
}

/** Sem banco ligado (binding DB ausente): o site funciona, mas nada é contado nem registrado. */
export class BancoNulo implements Banco {
  async registrarAcesso() {}
  /** Sem como contar tentativas, a recuperação fica fechada (nunca sem limite). */
  async contarAcessos() {
    return Number.MAX_SAFE_INTEGER;
  }
  async incrementar() {}
  async marcarPagamentoContado() {
    return true;
  }
  async contadores() {
    return zerado();
  }
  async porVariante() {
    return {};
  }
  async gastos() {
    return [];
  }
  async salvarGasto() {}
  async lerConfig() {
    return { ...CONFIG_PADRAO };
  }
  async salvarConfig() {}
  async limpar() {}
}
