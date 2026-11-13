// API do site no Netlify (o Worker em worker/ fica só como referência até a virada).
// Segredos: variáveis de ambiente do Netlify. Dados operacionais: Netlify Blobs.
import { getStore } from "@netlify/blobs";
import { tratar } from "../../worker/src/app";
import { BancoKv, type Kv } from "../../worker/src/banco-kv";
import type { Env } from "../../worker/src/env";
import { completarEnv } from "../../worker/src/padroes";
import { criarServicos } from "../../worker/src/servicos";

function kvBlobs(): Kv {
  const store = getStore({ name: "segredo", consistency: "strong" });
  return {
    async get(chave) {
      return (await store.get(chave)) ?? null;
    },
    async set(chave, valor) {
      await store.set(chave, valor);
    },
    async del(chave) {
      await store.delete(chave);
    },
    async list(prefixo) {
      const chaves: string[] = [];
      for await (const pagina of store.list({ prefix: prefixo, paginate: true })) {
        for (const b of pagina.blobs) chaves.push(b.key);
      }
      return chaves;
    },
  };
}

const texto = (v: string | undefined) => (v && v.length > 0 ? v : undefined);

function envDeProcesso(): Env {
  const g = process.env;
  const preview = g.CONTEXT && g.CONTEXT !== "production";
  return {
    MP_ACCESS_TOKEN: g.MP_ACCESS_TOKEN ?? "",
    MP_WEBHOOK_SECRET: g.MP_WEBHOOK_SECRET ?? "",
    SEGREDO: texto(g.SEGREDO),
    SEGREDO_CHAVE: g.SEGREDO_CHAVE ?? "",
    SEGREDO_PASSE: g.SEGREDO_PASSE ?? "",
    SEGREDO_SEMENTE: g.SEGREDO_SEMENTE ?? "",
    SEGREDO_PASSE_VERSAO: texto(g.SEGREDO_PASSE_VERSAO),
    SEGREDO_PASSE_ANTERIOR: texto(g.SEGREDO_PASSE_ANTERIOR),
    SEGREDO_PASSE_ANTERIOR_VERSAO: texto(g.SEGREDO_PASSE_ANTERIOR_VERSAO),
    META_PIXEL_ID: texto(g.META_PIXEL_ID),
    META_CAPI_TOKEN: texto(g.META_CAPI_TOKEN),
    META_TEST_EVENT_CODE: texto(g.META_TEST_EVENT_CODE),
    META_GRAPH_VERSION: texto(g.META_GRAPH_VERSION),
    VAPID_PRIVADA: texto(g.VAPID_PRIVADA),
    PAINEL_CHAVE: texto(g.PAINEL_CHAVE),
    ADMIN_EMAILS: g.ADMIN_EMAILS ?? "",
    CF_ACCESS_AUD: g.CF_ACCESS_AUD ?? "",
    CF_ACCESS_TEAM_DOMAIN: g.CF_ACCESS_TEAM_DOMAIN ?? "",
    PUBLIC_BASE_URL: g.PUBLIC_BASE_URL ?? "",
    MP_API_BASE: texto(g.MP_API_BASE),
    // Produção ignora MP_API_BASE. Preview e branch usam a API real, salvo se o dono apontar um simulador.
    AMBIENTE: texto(g.AMBIENTE) ?? (preview ? "dev" : "production"),
    PIX_VALIDADE_MINUTOS: texto(g.PIX_VALIDADE_MINUTOS),
  };
}

let banco: BancoKv | undefined;

export default async (req: Request, contexto: { waitUntil?: (p: Promise<unknown>) => void }) => {
  const env = completarEnv(envDeProcesso());
  banco ??= new BancoKv(kvBlobs());
  const espera = contexto.waitUntil ? contexto.waitUntil.bind(contexto) : (p: Promise<unknown>) => void p.catch(() => undefined);
  return tratar(normalizar(req), criarServicos(env, { waitUntil: espera }, banco));
};

/** A reescrita do Netlify pode entregar o caminho como /.netlify/functions/api/checkout. */
function normalizar(req: Request): Request {
  const url = new URL(req.url);
  const marca = "/.netlify/functions/api";
  const i = url.pathname.indexOf(marca);
  if (i < 0) return req;
  url.pathname = url.pathname.slice(i + marca.length) || "/";
  return new Request(url, req);
}
