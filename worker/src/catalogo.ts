// Catálogo do servidor: única fonte de preço, content_ids e valor (RASTREAMENTO_META.md, 3).

export interface Produto {
  codigo: string;
  nome: string;
  precoCentavos: number;
  moeda: "BRL";
}

export const PRODUTO_NOME: Produto = {
  codigo: "nome_completo_v1",
  nome: "Segredo do Nome",
  precoCentavos: 3700,
  moeda: "BRL",
};

/**
 * Preços anteriores: R$ 11,90 até 23/10/2026, R$ 13,90 até 25/10/2026 e R$ 17,90 até a troca para R$ 37,00
 * (decisão de 29/10/2026).
 * Continuam aceitos para Pix gerados antes da troca e para recuperar compras antigas.
 */
export const PRECOS_ANTERIORES_CENTAVOS = [1790, 1390, 1190] as const;

/** Vendas de antes do registro de receita (até 23/10/2026) eram todas a R$ 11,90. */
export const PRECO_SEM_REGISTRO_CENTAVOS = 1190;

/** Valor de um pagamento nosso: o preço atual ou um anterior. */
export const precoAceito = (cents: number) =>
  cents === PRODUTO_NOME.precoCentavos || (PRECOS_ANTERIORES_CENTAVOS as readonly number[]).includes(cents);

export const PRODUTO_CASAL_ID = "casal_completo_v1";

/** Descrição genérica enviada ao Mercado Pago (nenhum dado pessoal). */
export const DESCRICAO_PIX = "Segredo do Nome - resultado completo";

export const reais = (centavos: number) => centavos / 100;
export const centavos = (valor: number) => Math.round(valor * 100);
