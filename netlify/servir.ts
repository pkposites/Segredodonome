// Site + API no mesmo processo, para testar no celular sem publicar.
//   node worker/scripts/mp-simulado.mjs
//   cd worker && npx tsx ../netlify/servir.ts
// Abre http://localhost:8788
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { tratar } from "../worker/src/app";
import { BancoKv } from "../worker/src/banco-kv";
import type { Env } from "../worker/src/env";
import { completarEnv } from "../worker/src/padroes";
import { criarServicos } from "../worker/src/servicos";
import { KvArquivo } from "./kv-arquivo";

const PORTA = Number(process.env.PORTA ?? 8788);
const RAIZ = fileURLToPath(new URL("../web", import.meta.url));
const TIPOS: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".json": "application/json",
  ".woff2": "font/woff2",
};
const REESCRITAS: Record<string, string> = {
  "/": "/index.html",
  "/quiz": "/index.html",
  "/r": "/index.html",
  "/termos": "/termos.html",
  "/privacidade": "/privacidade.html",
  "/reembolso": "/reembolso.html",
  "/contato": "/contato.html",
};
const API = /^\/(resultado|checkout|pagamento\/status|recuperar|evento|bonus\/casal|recuperacao\/contato|recuperacao\/abrir|webhook\/mercadopago|saude|painel|admin\/.*|painel-sw\.js|painel\.webmanifest|painel-icone-192\.png|painel-icone-512\.png)$/;

const env = completarEnv({
  AMBIENTE: "dev",
  PUBLIC_BASE_URL: `http://localhost:${PORTA}`,
  MP_API_BASE: process.env.MP_API_BASE ?? "http://127.0.0.1:8790",
  MP_ACCESS_TOKEN: process.env.MP_ACCESS_TOKEN ?? "TEST-local",
  MP_WEBHOOK_SECRET: process.env.MP_WEBHOOK_SECRET ?? "segredo-webhook-local",
  SEGREDO: process.env.SEGREDO ?? "segredo-local-de-teste",
  SEGREDO_CHAVE: "",
  SEGREDO_PASSE: "",
  SEGREDO_SEMENTE: "",
  PAINEL_CHAVE: process.env.PAINEL_CHAVE ?? "chave-local-de-teste-123456",
  ADMIN_EMAILS: "rob@exemplo.com",
  CF_ACCESS_AUD: "",
  CF_ACCESS_TEAM_DOMAIN: "",
  PIX_VALIDADE_MINUTOS: process.env.PIX_VALIDADE_MINUTOS ?? "360",
} as Env);

const banco = new BancoKv(new KvArquivo(fileURLToPath(new URL("../worker/.data/banco.json", import.meta.url))));
const pendentes: Promise<unknown>[] = [];
const servicos = criarServicos(env, { waitUntil: (p) => void pendentes.push(p.catch(() => undefined)) }, banco);

const cspBruta = await readFile(join(RAIZ, "_headers"), "utf8");
const CSP = (cspBruta.match(/Content-Security-Policy: (.*)/) ?? ["", ""])[1] ?? "";

function caminhoArquivo(pathname: string) {
  let caminho = pathname;
  if (/^\/(referencia-visual|scripts|painel)\//.test(caminho) || caminho === "/TELAS.md") caminho = "/404";
  caminho = REESCRITAS[caminho] ?? (caminho.startsWith("/quiz/") ? "/index.html" : caminho);
  const arquivo = normalize(join(RAIZ, caminho));
  if (!arquivo.startsWith(RAIZ)) return null;
  return arquivo;
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORTA}`);
  if (API.test(url.pathname.replace(/\/+$/, "") || "/")) {
    const pedacos: Buffer[] = [];
    for await (const c of req) pedacos.push(c as Buffer);
    const corpo = Buffer.concat(pedacos);
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) if (typeof v === "string") headers.set(k, v);
    if (!headers.has("origin")) headers.set("origin", `http://localhost:${PORTA}`);
    const pedido = new Request(url, { method: req.method, headers, body: req.method === "GET" || req.method === "HEAD" ? undefined : corpo });
    const resp = await tratar(pedido, servicos);
    await Promise.all(pendentes.splice(0));
    const buf = Buffer.from(await resp.arrayBuffer());
    const saida: Record<string, string> = {};
    resp.headers.forEach((v, k) => (saida[k] = v));
    res.writeHead(resp.status, saida);
    res.end(buf);
    return;
  }
  const arquivo = caminhoArquivo(url.pathname);
  if (!arquivo) return res.writeHead(403).end();
  try {
    const dados = await readFile(arquivo);
    res.writeHead(200, {
      "content-type": TIPOS[extname(arquivo)] ?? "application/octet-stream",
      "cache-control": "no-store",
      "content-security-policy": CSP,
    });
    res.end(dados);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("Não encontrado");
  }
}).listen(PORTA, () => console.log(`Site e API em http://localhost:${PORTA}`));
