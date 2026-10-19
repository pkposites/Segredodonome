// Servidor estático local com as mesmas reescritas do _redirects (Netlify).
// Uso (na raiz do repositório): node web/scripts/servidor-local.mjs   → http://localhost:8788
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const PORTA = Number(process.env.PORTA ?? 8788);
// RAIZ=/outra/pasta serve outra cópia (ex.: a prévia montada por worker/scripts/gerar-previa.mjs).
const RAIZ = process.env.RAIZ ?? fileURLToPath(new URL("..", import.meta.url));
const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json" };
const REESCRITAS = { "/": "/index.html", "/quiz": "/index.html", "/r": "/index.html", "/termos": "/termos.html", "/privacidade": "/privacidade.html", "/reembolso": "/reembolso.html", "/contato": "/contato.html" };
// Mesma CSP do _headers, com a API local no lugar do domínio do Worker.
const CSP = (await readFile(join(RAIZ, "_headers"), "utf8"))
  .match(/Content-Security-Policy: (.*)/)[1]
  .replace("https://segredo-api.relatoriorda.com.br", "http://localhost:8799");
const BLOQUEADOS = /^\/(referencia-visual|scripts|painel)\/|^\/TELAS\.md$/;

createServer(async (req, res) => {
  let caminho = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (BLOQUEADOS.test(caminho)) caminho = "/404";
  caminho = REESCRITAS[caminho] ?? (caminho.startsWith("/quiz/") ? "/index.html" : caminho);
  const arquivo = normalize(join(RAIZ, caminho));
  if (!arquivo.startsWith(RAIZ)) return res.writeHead(403).end();
  try {
    const dados = await readFile(arquivo);
    res.writeHead(200, { "content-type": TIPOS[extname(arquivo)] ?? "application/octet-stream", "cache-control": "no-store", "content-security-policy": CSP });
    res.end(dados);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("Não encontrado");
  }
}).listen(PORTA, () => console.log(`Front em http://localhost:${PORTA}`));
