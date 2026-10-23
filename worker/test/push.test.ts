import { describe, expect, it, vi } from "vitest";
import { b64url, deB64url, endpointValido, jwtVapid, lerJwk, WebPush } from "../src/push";

async function novaChave() {
  const par = (await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"])) as CryptoKeyPair;
  const j = (await crypto.subtle.exportKey("jwk", par.privateKey)) as JsonWebKey;
  return { texto: JSON.stringify({ kty: j.kty, crv: j.crv, x: j.x, y: j.y, d: j.d }), publica: par.publicKey };
}

const APPLE = "https://web.push.apple.com/QGuQyavXutnMH2r5LHxQrMzYXzJ1A3S3";

describe("Web Push (VAPID)", () => {
  it("aceita só serviços de push dos navegadores", () => {
    expect(endpointValido(APPLE)).toBe(true);
    expect(endpointValido("https://fcm.googleapis.com/fcm/send/abc")).toBe(true);
    expect(endpointValido("https://exemplo.com/push")).toBe(false);
    expect(endpointValido("http://web.push.apple.com/x")).toBe(false);
    expect(endpointValido(42)).toBe(false);
  });

  it("JWT ES256 verifica com a chave pública e tem aud = origem do serviço", async () => {
    const { texto, publica } = await novaChave();
    const jwt = await jwtVapid(lerJwk(texto)!, APPLE, "mailto:a@b.c", new Date("2026-10-23T12:00:00Z"));
    const [h, p, sig] = jwt.split(".");
    const ok = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, publica, deB64url(sig!), new TextEncoder().encode(`${h}.${p}`));
    expect(ok).toBe(true);
    const corpo = JSON.parse(new TextDecoder().decode(deB64url(p!)));
    expect(corpo).toEqual({ aud: "https://web.push.apple.com", exp: Math.floor(Date.parse("2026-10-23T12:00:00Z") / 1000) + 43200, sub: "mailto:a@b.c" });
  });

  it("envia push sem conteúdo com cabeçalho vapid e chave pública de 65 bytes", async () => {
    const { texto, publica } = await novaChave();
    const fetcher = vi.fn(async () => new Response(null, { status: 201 }));
    const push = new WebPush(texto, "mailto:a@b.c", fetcher as unknown as typeof fetch);
    expect(push.ligado()).toBe(true);
    const crua = new Uint8Array((await crypto.subtle.exportKey("raw", publica)) as ArrayBuffer);
    expect(push.chavePublica()).toBe(b64url(crua));
    expect(await push.enviar(APPLE)).toBe(201);
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    const cab = init.headers as Record<string, string>;
    expect(url).toBe(APPLE);
    expect(cab.authorization).toMatch(new RegExp(`^vapid t=[\\w-]+\\.[\\w-]+\\.[\\w-]+, k=${push.chavePublica()}$`));
    expect(cab.ttl).toBe("86400");
    expect(init.body).toBeUndefined();
  });

  it("sem chave ou com endereço estranho não envia nada", async () => {
    const fetcher = vi.fn();
    expect(await new WebPush(undefined, "mailto:a@b.c", fetcher).enviar(APPLE)).toBe(0);
    expect(new WebPush("{lixo", "mailto:a@b.c", fetcher).ligado()).toBe(false);
    const { texto } = await novaChave();
    expect(await new WebPush(texto, "mailto:a@b.c", fetcher).enviar("https://exemplo.com/x")).toBe(0);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
