// Semente de variação (ESPECIFICACAO.md, 4.6) e chave do pagamento (ARQUITETURA.md, 2).
import { hmacSha256, paraHex } from "../cripto/hmac";

/** Cada bloco de texto usa sempre o mesmo par de bytes da semente. */
export const POSICAO_NA_SEMENTE = {
  essencia: 0,
  caracteristicas: 1,
  como_chegamos: 2,
  coracao: 3,
  imagem: 4,
  ponto_cego: 5,
} as const;

export type BlocoComSemente = keyof typeof POSICAO_NA_SEMENTE;

export class Semente {
  constructor(private readonly bytes: Uint8Array) {}

  /** Índice determinístico em [0, total) para o bloco. */
  escolher(bloco: BlocoComSemente, total: number): number {
    if (total <= 0) throw new Error("Nenhuma opção para escolher");
    const i = POSICAO_NA_SEMENTE[bloco] * 2;
    const valor = (this.bytes[i]! << 8) | this.bytes[i + 1]!;
    return valor % total;
  }
}

export async function gerarSemente(segredo: string, nomeNormalizado: string, dataIso: string) {
  return new Semente(await hmacSha256(segredo, `${nomeNormalizado}|${dataIso}`));
}

export async function gerarChave(segredo: string, nomeNormalizado: string, dataIso: string) {
  return paraHex(await hmacSha256(segredo, `${nomeNormalizado}|${dataIso}`)).slice(0, 32);
}

export const PREFIXO_REFERENCIA = "sdn1-";
export const referenciaExterna = (chave: string) => `${PREFIXO_REFERENCIA}${chave}`;
