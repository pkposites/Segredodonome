-- Preço novo (R$ 13,90 a partir de 23/10/2026): a receita passa a ser somada pelo valor realmente
-- pago, para o painel ficar certo com vendas a preços diferentes. Só totais por dia, sem pessoa.
CREATE TABLE IF NOT EXISTS receita (
  dia          TEXT NOT NULL,
  utm_campaign TEXT NOT NULL DEFAULT '(sem)',
  variante     TEXT NOT NULL DEFAULT 'v1',
  vendas       INTEGER NOT NULL DEFAULT 0,
  centavos     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (dia, utm_campaign, variante)
);
