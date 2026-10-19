-- Redesign v2 (19/10/2026): etapas novas do funil e coluna `variante` para comparar versões
-- da experiência no painel. Continua sem pessoa e sem sessão. SQLite não altera CHECK:
-- a tabela é recriada e os dados antigos ficam como variante 'v1'.
CREATE TABLE contadores_novo (
  dia          TEXT NOT NULL,
  etapa        TEXT NOT NULL CHECK (etapa IN (
                 'visita','escolha_nome','quiz_inicio','quiz_metade',
                 'quiz_passo_1','quiz_passo_2','quiz_passo_3','quiz_passo_4','quiz_passo_5',
                 'quiz_passo_6','quiz_passo_7','quiz_passo_8','quiz_passo_9',
                 'resultado_visto','oferta_vista','comprar_toque',
                 'pix_gerado','pix_copiado','pix_pago','pago_entregue','pdf_salvo','casal_interesse')),
  utm_campaign TEXT NOT NULL DEFAULT '(sem)',
  variante     TEXT NOT NULL DEFAULT 'v1',
  total        INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (dia, etapa, utm_campaign, variante)
);
INSERT INTO contadores_novo (dia, etapa, utm_campaign, variante, total)
  SELECT dia, etapa, utm_campaign, 'v1', total FROM contadores;
DROP TABLE contadores;
ALTER TABLE contadores_novo RENAME TO contadores;
