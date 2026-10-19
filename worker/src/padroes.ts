// Padrões de produção embutidos no código: no painel da Cloudflare só entram os tokens.
// Qualquer variável cadastrada no painel continua valendo por cima destes valores.
import type { Env } from "./env";

export const PADROES = {
  AMBIENTE: "production",
  PUBLIC_BASE_URL: "https://segredo.relatoriorda.com.br",
  PIX_VALIDADE_MINUTOS: "30",
  META_GRAPH_VERSION: "v26.0",
  META_PIXEL_ID: "2132885950950048",
} as const;

/**
 * Completa o Env com os padrões e, se só houver o segredo único `SEGREDO`, deriva dele as
 * três chaves internas (cada uma com rótulo próprio, então nunca se repetem).
 */
export function completarEnv(env: Env): Env {
  const e: Env = { ...PADROES, ...semVazios(env) } as Env;
  if (e.SEGREDO) {
    e.SEGREDO_CHAVE ||= `${e.SEGREDO}|chave`;
    e.SEGREDO_PASSE ||= `${e.SEGREDO}|passe`;
    e.SEGREDO_SEMENTE ||= `${e.SEGREDO}|semente`;
  }
  return e;
}

function semVazios(env: Env): Partial<Env> {
  const r: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(env)) if (v !== "" && v !== undefined) r[k] = v;
  return r as Partial<Env>;
}
