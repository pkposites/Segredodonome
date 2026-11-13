-- 13/11/2026. Referência para quem ainda usar o D1. A virada usa Netlify Blobs e NÃO aplica este arquivo no remoto.
-- Novas etapas do funil e a tabela do WhatsApp opcional (número + rascunho cifrado). Sem nome em claro.

CREATE TABLE contadores_novo (
  dia          TEXT NOT NULL,
  etapa        TEXT NOT NULL CHECK (etapa IN (
                 'visita','escolha_nome','quiz_inicio','quiz_metade',
                 'quiz_passo_1','quiz_passo_2','quiz_passo_3','quiz_passo_4','quiz_passo_5',
                 'quiz_passo_6','quiz_passo_7','quiz_passo_8','quiz_passo_9',
                 'resultado_visto','oferta_vista','comprar_toque','checkout_clicado',
                 'pix_gerado','pix_copiado','pix_pago','pago_entregue','pdf_salvo','casal_interesse',
                 'bump_aceito','upsell_aceito')),
  utm_campaign TEXT NOT NULL DEFAULT '(sem)',
  variante     TEXT NOT NULL DEFAULT 'v1',
  total        INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (dia, etapa, utm_campaign, variante)
);
INSERT INTO contadores_novo (dia, etapa, utm_campaign, variante, total)
  SELECT dia, etapa, utm_campaign, variante, total FROM contadores;
DROP TABLE contadores;
ALTER TABLE contadores_novo RENAME TO contadores;

CREATE TABLE IF NOT EXISTS pix_recuperacao (
  pagamento_id     TEXT PRIMARY KEY,
  whatsapp         TEXT NOT NULL,
  consentimento_em TEXT NOT NULL,
  versao_texto     TEXT NOT NULL,
  valor_centavos   INTEGER NOT NULL,
  expira_em        TEXT NOT NULL,
  criado_em        TEXT NOT NULL,
  token            TEXT NOT NULL,
  rascunho         TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pendente'
);
CREATE INDEX IF NOT EXISTS idx_pix_recuperacao_token ON pix_recuperacao (token);
