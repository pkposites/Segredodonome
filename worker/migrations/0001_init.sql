-- Segredo do Nome — Cloudflare D1 (SQLite). RASCUNHO para revisão na Fase 0.
-- NENHUMA tabela guarda dado de cliente (nome, data, respostas, e-mail, resultado).
-- Acesso só pelo Worker (binding D1); o painel lê pelos endpoints /admin/*.

-- Registros de acesso exigidos pelo Marco Civil da Internet (art. 15): 6 meses
CREATE TABLE IF NOT EXISTS access_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  ip          TEXT NOT NULL,
  ocorrido_em TEXT NOT NULL,            -- ISO-8601 UTC
  metodo      TEXT NOT NULL,
  rota        TEXT NOT NULL,            -- só o caminho, sem query string nem fragmento
  status      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_access_logs_data ON access_logs (ocorrido_em);

-- Contadores do funil (sem pessoa, sem sessão): o painel "visitas, iniciaram, seguiram..."
CREATE TABLE IF NOT EXISTS contadores (
  dia          TEXT NOT NULL,           -- YYYY-MM-DD (America/Sao_Paulo)
  etapa        TEXT NOT NULL CHECK (etapa IN (
                 'visita','quiz_inicio','quiz_metade','resultado_visto','comprar_toque',
                 'pix_gerado','pix_copiado','pix_pago','pdf_salvo','casal_interesse')),
  utm_campaign TEXT NOT NULL DEFAULT '(sem)',
  total        INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (dia, etapa, utm_campaign)
);
-- Incremento: INSERT INTO contadores (dia, etapa, utm_campaign, total) VALUES (?, ?, ?, 1)
--             ON CONFLICT (dia, etapa, utm_campaign) DO UPDATE SET total = total + 1;

-- Pagamentos já contados (evita contar duas vezes quando o Mercado Pago reenvia o webhook).
-- Só o ID do pagamento e a data; apagados depois de 7 dias.
CREATE TABLE IF NOT EXISTS pagamentos_contados (
  pagamento_id TEXT PRIMARY KEY,
  contado_em   TEXT NOT NULL
);

-- Gasto de mídia digitado no painel
CREATE TABLE IF NOT EXISTS gasto_midia (
  dia           TEXT NOT NULL,
  campanha      TEXT NOT NULL DEFAULT '(total)',
  gasto_cents   INTEGER NOT NULL CHECK (gasto_cents >= 0),
  atualizado_em TEXT NOT NULL,
  PRIMARY KEY (dia, campanha)
);

-- Configurações do painel (taxa do Pix e imposto estimado)
CREATE TABLE IF NOT EXISTS config (
  chave TEXT PRIMARY KEY,
  valor TEXT NOT NULL                   -- JSON
);
