// Catálogo do servidor: única fonte de preço, content_ids e valor (RASTREAMENTO_META.md, 3).
// O navegador nunca envia o valor cobrado.

export interface Produto {
  codigo: string;
  nome: string;
  precoCentavos: number;
  moeda: "BRL";
}

/** Resultado completo do nome. Desde 13/11/2026. */
export const PRODUTO_NOME: Produto = {
  codigo: "nome_completo_v1",
  nome: "Segredo do Nome",
  precoCentavos: 2700,
  moeda: "BRL",
};

/** Adicional opcional: order bump no checkout ou upsell depois da compra. */
export const PRODUTO_CASAL: Produto = {
  codigo: "casal_completo_v1",
  nome: "Compatibilidade do Casal",
  precoCentavos: 1700,
  moeda: "BRL",
};

export const PRODUTO_CASAL_ID = PRODUTO_CASAL.codigo;

/** Nome + casal marcados juntos no mesmo Pix. */
export const PRECO_COM_BUMP_CENTAVOS = PRODUTO_NOME.precoCentavos + PRODUTO_CASAL.precoCentavos;

/**
 * Preços em que o casal ia incluso, sem cobrança separada:
 * R$ 11,90 até 23/10/2026, R$ 13,90 até 25/10/2026, R$ 17,90 até 29/10/2026 e R$ 37,00 até 13/11/2026.
 * Continuam aceitos para Pix gerados antes da troca e para recuperar compras antigas.
 */
export const PRECOS_ANTERIORES_CENTAVOS = [3700, 1790, 1390, 1190] as const;

/** Vendas de antes do registro de receita (até 23/10/2026) eram todas a R$ 11,90. */
export const PRECO_SEM_REGISTRO_CENTAVOS = 1190;

/** Sufixo da external_reference do Pix só do casal (upsell). O do nome não leva sufixo. */
export const SUFIXO_REFERENCIA_CASAL = ":c";

/** Pix do resultado (nome sozinho, nome+casal ou um preço antigo). R$ 17,00 sozinho não entra aqui. */
export const precoDoResultado = (cents: number) =>
  cents === PRODUTO_NOME.precoCentavos ||
  cents === PRECO_COM_BUMP_CENTAVOS ||
  (PRECOS_ANTERIORES_CENTAVOS as readonly number[]).includes(cents);

/** Qualquer Pix nosso: resultado ou o adicional do casal. */
export const precoAceito = (cents: number) => precoDoResultado(cents) || cents === PRODUTO_CASAL.precoCentavos;

/**
 * O casal está neste valor? Preços antigos incluíam o bônus. R$ 44,00 é o bump.
 * R$ 27,00 não inclui: o casal entra por um Pix separado de R$ 17,00.
 */
export const incluiCasalNoValor = (cents: number) =>
  cents === PRECO_COM_BUMP_CENTAVOS || (PRECOS_ANTERIORES_CENTAVOS as readonly number[]).includes(cents);

export function itensDoValor(valorCentavos: number): { id: string; quantity: number; item_price: number }[] {
  if (valorCentavos === PRECO_COM_BUMP_CENTAVOS) {
    return [
      { id: PRODUTO_NOME.codigo, quantity: 1, item_price: reais(PRODUTO_NOME.precoCentavos) },
      { id: PRODUTO_CASAL.codigo, quantity: 1, item_price: reais(PRODUTO_CASAL.precoCentavos) },
    ];
  }
  if (valorCentavos === PRODUTO_CASAL.precoCentavos) {
    return [{ id: PRODUTO_CASAL.codigo, quantity: 1, item_price: reais(PRODUTO_CASAL.precoCentavos) }];
  }
  return [{ id: PRODUTO_NOME.codigo, quantity: 1, item_price: reais(valorCentavos) }];
}

/** Descrição genérica enviada ao Mercado Pago (nenhum dado pessoal). */
export const DESCRICAO_PIX = "Segredo do Nome - resultado completo";
export const DESCRICAO_PIX_CASAL = "Segredo do Nome - compatibilidade do casal";

export const reais = (centavos: number) => centavos / 100;
export const centavos = (valor: number) => Math.round(valor * 100);

/** Validade padrão do Pix: 6 horas (o navegador do Instagram costuma tirar a pessoa da tela). */
export const PIX_VALIDADE_PADRAO_MIN = 360;
