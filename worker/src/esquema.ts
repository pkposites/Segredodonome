// Cria as tabelas sozinho na primeira requisição (equivale às migrações 0001–0004).
// Assim ninguém precisa rodar SQL no painel da Cloudflare. Tudo é "IF NOT EXISTS":
// num banco já migrado pelo Wrangler, não muda nada.
import { BancoD1 } from "./banco";

const TABELAS = [
  `CREATE TABLE IF NOT EXISTS access_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip TEXT NOT NULL,
    ocorrido_em TEXT NOT NULL,
    metodo TEXT NOT NULL,
    rota TEXT NOT NULL,
    status INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_access_logs_data ON access_logs (ocorrido_em)`,
  `CREATE INDEX IF NOT EXISTS idx_access_logs_ip_rota ON access_logs (ip, rota, ocorrido_em)`,
  `CREATE TABLE IF NOT EXISTS contadores (
    dia TEXT NOT NULL,
    etapa TEXT NOT NULL CHECK (etapa IN (
      'visita','escolha_nome','quiz_inicio','quiz_metade',
      'quiz_passo_1','quiz_passo_2','quiz_passo_3','quiz_passo_4','quiz_passo_5',
      'quiz_passo_6','quiz_passo_7','quiz_passo_8','quiz_passo_9',
      'resultado_visto','oferta_vista','comprar_toque',
      'pix_gerado','pix_copiado','pix_pago','pago_entregue','pdf_salvo','casal_interesse')),
    utm_campaign TEXT NOT NULL DEFAULT '(sem)',
    variante TEXT NOT NULL DEFAULT 'v1',
    total INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (dia, etapa, utm_campaign, variante)
  )`,
  `CREATE TABLE IF NOT EXISTS pagamentos_contados (
    pagamento_id TEXT PRIMARY KEY,
    contado_em TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS gasto_midia (
    dia TEXT NOT NULL,
    campanha TEXT NOT NULL DEFAULT '(total)',
    gasto_cents INTEGER NOT NULL CHECK (gasto_cents >= 0),
    atualizado_em TEXT NOT NULL,
    PRIMARY KEY (dia, campanha)
  )`,
  `CREATE TABLE IF NOT EXISTS receita (
    dia TEXT NOT NULL,
    utm_campaign TEXT NOT NULL DEFAULT '(sem)',
    variante TEXT NOT NULL DEFAULT 'v1',
    vendas INTEGER NOT NULL DEFAULT 0,
    centavos INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (dia, utm_campaign, variante)
  )`,
  `CREATE TABLE IF NOT EXISTS config (
    chave TEXT PRIMARY KEY,
    valor TEXT NOT NULL
  )`,
];

let pronto: Promise<void> | null = null;
let ultimaLimpeza = "";

export function garantirEsquema(db: D1Database): Promise<void> {
  pronto ??= db
    .batch(TABELAS.map((t) => db.prepare(t)))
    .then(() => undefined)
    .catch((e) => {
      pronto = null; // tenta de novo na próxima requisição
      throw e;
    });
  return pronto;
}

/** Limpeza diária sem cron: a primeira requisição de cada dia (por instância) apaga o que venceu. */
export function limparSeNovoDia(db: D1Database, agora: Date): Promise<void> | null {
  const dia = agora.toISOString().slice(0, 10);
  if (dia === ultimaLimpeza) return null;
  ultimaLimpeza = dia;
  return new BancoD1(db).limpar(agora);
}
