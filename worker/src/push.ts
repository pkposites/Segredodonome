// Web Push (padrão dos navegadores, sem serviço pago) para avisar o Rob de cada venda.
// Push sem conteúdo: o service worker do painel busca a mensagem em /admin/push/mensagem.
// Assinatura VAPID (RFC 8292) com a chave do Secret VAPID_PRIVADA (JWK P-256 gerado no painel).

export interface Notificador {
  /** true se há chave VAPID cadastrada. */
  ligado(): boolean;
  /** Chave pública (base64url) para o navegador assinar a inscrição; null sem chave. */
  chavePublica(): string | null;
  /** Envia um aviso ao endereço do aparelho. Devolve o status HTTP do serviço de push. */
  enviar(endpoint: string): Promise<number>;
}

/** Serviços de push dos navegadores aceitos (Apple, Google, Mozilla, Microsoft). */
const HOSTS_PUSH = [/\.push\.apple\.com$/, /^fcm\.googleapis\.com$/, /\.push\.services\.mozilla\.com$/, /\.notify\.windows\.com$/];

export function endpointValido(v: unknown): v is string {
  if (typeof v !== "string" || v.length > 1000) return false;
  try {
    const u = new URL(v);
    return u.protocol === "https:" && HOSTS_PUSH.some((h) => h.test(u.hostname));
  } catch {
    return false;
  }
}

export const b64url = (bytes: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

export function deB64url(s: string): Uint8Array {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

interface JwkPrivada {
  kty: "EC";
  crv: "P-256";
  x: string;
  y: string;
  d: string;
}

export function lerJwk(texto: string | undefined): JwkPrivada | null {
  if (!texto) return null;
  try {
    const j = JSON.parse(texto) as Partial<JwkPrivada>;
    return j.kty === "EC" && j.crv === "P-256" && j.x && j.y && j.d ? (j as JwkPrivada) : null;
  } catch {
    return null;
  }
}

/** JWT ES256 do VAPID: aud = origem do serviço de push, validade de 12 h. */
export async function jwtVapid(jwk: JwkPrivada, endpoint: string, contato: string, agora: Date): Promise<string> {
  const chave = await crypto.subtle.importKey("jwk", { ...jwk, ext: true }, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const cod = (o: unknown) => b64url(new TextEncoder().encode(JSON.stringify(o)));
  const corpo = `${cod({ typ: "JWT", alg: "ES256" })}.${cod({ aud: new URL(endpoint).origin, exp: Math.floor(agora.getTime() / 1000) + 12 * 3600, sub: contato })}`;
  const assinatura = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, chave, new TextEncoder().encode(corpo));
  return `${corpo}.${b64url(assinatura)}`;
}

export class WebPush implements Notificador {
  private readonly jwk: JwkPrivada | null;
  constructor(
    jwkTexto: string | undefined,
    private readonly contato: string,
    private readonly fetcher: typeof fetch = (i, init) => fetch(i, init),
    private readonly agora: () => Date = () => new Date(),
  ) {
    this.jwk = lerJwk(jwkTexto);
  }

  ligado() {
    return this.jwk !== null;
  }

  chavePublica() {
    if (!this.jwk) return null;
    const x = deB64url(this.jwk.x);
    const y = deB64url(this.jwk.y);
    return b64url(Uint8Array.from([4, ...x, ...y]));
  }

  async enviar(endpoint: string): Promise<number> {
    if (!this.jwk || !endpointValido(endpoint)) return 0;
    const jwt = await jwtVapid(this.jwk, endpoint, this.contato, this.agora());
    const r = await this.fetcher(endpoint, {
      method: "POST",
      headers: { authorization: `vapid t=${jwt}, k=${this.chavePublica()}`, ttl: "86400", urgency: "high", "content-length": "0" },
    });
    return r.status;
  }
}
