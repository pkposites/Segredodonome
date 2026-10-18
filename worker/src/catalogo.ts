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
  precoCentavos: 1190,
  moeda: "BRL",
};

export const PRODUTO_CASAL_ID = "casal_completo_v1";

/** Descrição genérica enviada ao Mercado Pago (nenhum dado pessoal). */
export const DESCRICAO_PIX = "Segredo do Nome - resultado completo";

export const reais = (centavos: number) => centavos / 100;
export const centavos = (valor: number) => Math.round(valor * 100);
