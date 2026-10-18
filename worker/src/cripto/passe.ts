// Passe: as entradas da pessoa + o ID do pagamento, cifrados com AES-256-GCM.
// Só o Worker abre. Formato: base64url( versão da chave (1 byte) | IV (12) | cifrado+tag ).
// ARQUITETURA.md, 2 e SEGURANCA_E_LGPD.md, 2.
import type { Entradas } from "../motor";
import { deBase64url, paraBase64url } from "./base64url";

export interface ConteudoPasse {
  v: 1;
  nome: string;
  data: string;
  tratamento: Entradas["tratamento"];
  respostas: number[];
  pagamento_id: string;
  content_version: string;
  emitido_em: string; // ISO-8601
  expira_em: string; // ISO-8601
}

/** Chaves por versão: a atual cifra; as outras só abrem passes antigos. */
export interface ChavesPasse {
  atual: number;
  segredos: Record<number, string>;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const cacheChaves = new Map<string, Promise<CryptoKey>>();

function derivarChave(segredo: string, versao: number): Promise<CryptoKey> {
  const id = `${versao}:${segredo}`;
  let chave = cacheChaves.get(id);
  if (!chave) {
    chave = crypto.subtle
      .importKey("raw", encoder.encode(segredo), "HKDF", false, ["deriveKey"])
      .then((base) =>
        crypto.subtle.deriveKey(
          { name: "HKDF", hash: "SHA-256", salt: encoder.encode("sdn-passe"), info: encoder.encode(`v${versao}`) },
          base,
          { name: "AES-GCM", length: 256 },
          false,
          ["encrypt", "decrypt"],
        ),
      );
    cacheChaves.set(id, chave);
  }
  return chave;
}

export async function emitirPasse(conteudo: ConteudoPasse, chaves: ChavesPasse): Promise<string> {
  const versao = chaves.atual;
  const segredo = chaves.segredos[versao];
  if (!segredo || versao < 1 || versao > 255) throw new Error("Chave atual do passe ausente");
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cabecalho = Uint8Array.of(versao);
  const cifrado = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv, additionalData: cabecalho },
      await derivarChave(segredo, versao),
      encoder.encode(JSON.stringify(conteudo)),
    ),
  );
  const saida = new Uint8Array(1 + iv.length + cifrado.length);
  saida.set(cabecalho, 0);
  saida.set(iv, 1);
  saida.set(cifrado, 1 + iv.length);
  return paraBase64url(saida);
}

/** Devolve null para passe alterado, de chave desconhecida ou malformado. Não checa validade. */
export async function abrirPasse(passe: string, chaves: ChavesPasse): Promise<ConteudoPasse | null> {
  if (passe.length > 4096) return null;
  const bytes = deBase64url(passe);
  if (!bytes || bytes.length < 1 + 12 + 16) return null;
  const versao = bytes[0]!;
  const segredo = chaves.segredos[versao];
  if (!segredo) return null;
  try {
    const aberto = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: bytes.slice(1, 13), additionalData: bytes.slice(0, 1) },
      await derivarChave(segredo, versao),
      bytes.slice(13),
    );
    const c = JSON.parse(decoder.decode(aberto)) as ConteudoPasse;
    return c.v === 1 ? c : null;
  } catch {
    return null;
  }
}

export function passeVencido(c: ConteudoPasse, agora: Date): boolean {
  return Date.parse(c.expira_em) <= agora.getTime();
}

/** Validade de 12 meses contados do pagamento (ESPECIFICACAO.md, 1). */
export function expiraEm(aprovadoEm: Date): Date {
  const d = new Date(aprovadoEm.getTime());
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d;
}
