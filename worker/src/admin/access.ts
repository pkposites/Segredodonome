// Validação do JWT do Cloudflare Access em /admin/* e /painel (SEGURANCA_E_LGPD.md, 2).
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

const jwksPorEquipe = new Map<string, JWTVerifyGetKey>();

function jwks(equipe: string): JWTVerifyGetKey {
  let j = jwksPorEquipe.get(equipe);
  if (!j) {
    j = createRemoteJWKSet(new URL(`${equipe}/cdn-cgi/access/certs`));
    jwksPorEquipe.set(equipe, j);
  }
  return j;
}

export interface ConfigAccess {
  equipe: string; // https://<equipe>.cloudflareaccess.com
  aud: string;
  emails: string; // separados por vírgula
  chaves?: JWTVerifyGetKey; // injetável nos testes
  /** Chave do link secreto do painel (Secret PAINEL_CHAVE). Sem ela, só o Access abre. */
  chaveLink?: string;
}

const MIN_CHAVE = 24;

function iguais(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/** Link secreto: ?k= na página do painel; cabeçalho x-painel-chave nas chamadas /admin/*. */
function chaveDoLink(req: Request, c: ConfigAccess): boolean {
  if (!c.chaveLink || c.chaveLink.length < MIN_CHAVE) return false;
  const enviada = req.headers.get("x-painel-chave") ?? new URL(req.url).searchParams.get("k") ?? "";
  return iguais(enviada, c.chaveLink);
}

/** Devolve o e-mail autorizado ou null. */
export async function autorizarAdmin(req: Request, c: ConfigAccess): Promise<string | null> {
  if (chaveDoLink(req, c)) return "link";
  const token = req.headers.get("cf-access-jwt-assertion");
  if (!token || !c.equipe || !c.aud) return null;
  try {
    const { payload } = await jwtVerify(token, c.chaves ?? jwks(c.equipe), { issuer: c.equipe, audience: c.aud });
    const email = typeof payload.email === "string" ? payload.email.toLowerCase() : null;
    const permitidos = c.emails.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
    return email && permitidos.includes(email) ? email : null;
  } catch {
    return null;
  }
}
