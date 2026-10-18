const encoder = new TextEncoder();

export async function hmacSha256(segredo: string, mensagem: string): Promise<Uint8Array> {
  const chave = await crypto.subtle.importKey(
    "raw",
    encoder.encode(segredo),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", chave, encoder.encode(mensagem)));
}

export function paraHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sha256Hex(texto: string): Promise<string> {
  return paraHex(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(texto))));
}

/** Comparação em tempo constante para strings de mesmo tamanho. */
export function iguaisTempoConstante(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
