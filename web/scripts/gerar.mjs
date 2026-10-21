// Gera arquivos estáticos do front a partir das fontes do repositório:
//  - js/micro-revelacoes.js  ← content/nome/comum.json
//  - termos.html, privacidade.html, reembolso.html ← legal/*.md (texto sem alteração)
// Uso (na raiz do repositório): node web/scripts/gerar.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const raiz = (p) => fileURLToPath(new URL(`../../${p}`, import.meta.url));
const web = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url));

// ---------- micro-revelações ----------
const comum = JSON.parse(readFileSync(raiz("content/nome/comum.json"), "utf8"));
writeFileSync(
  web("js/micro-revelacoes.js"),
  `// GERADO por web/scripts/gerar.mjs a partir de content/nome/comum.json. Não edite à mão.\nexport const MICRO_REVELACOES = ${JSON.stringify(comum.micro_revelacoes, null, 2)};\n`,
);

// ---------- Markdown mínimo → HTML (títulos, parágrafos, listas, tabelas, negrito, links) ----------
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function inline(s) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\((\/[a-z-]*|https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>');
}

function markdown(md) {
  const linhas = md.split("\n");
  const out = [];
  let i = 0;
  while (i < linhas.length) {
    const l = linhas[i];
    if (!l.trim()) { i++; continue; }
    const t = l.match(/^(#{1,3})\s+(.*)$/);
    if (t) { out.push(`<h${t[1].length}>${inline(t[2])}</h${t[1].length}>`); i++; continue; }
    if (l.startsWith("|")) {
      const bloco = [];
      while (i < linhas.length && linhas[i].startsWith("|")) bloco.push(linhas[i++]);
      const celulas = (r) => r.split("|").slice(1, -1).map((c) => c.trim());
      const [cab, , ...corpo] = bloco;
      out.push(
        `<table><thead><tr>${celulas(cab).map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>${corpo
          .map((r) => `<tr>${celulas(r).map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`)
          .join("")}</tbody></table>`,
      );
      continue;
    }
    if (/^\s*[-*] /.test(l)) {
      const itens = [];
      while (i < linhas.length && /^\s*[-*] /.test(linhas[i])) itens.push(linhas[i++].replace(/^\s*[-*] /, ""));
      out.push(`<ul>${itens.map((x) => `<li>${inline(x)}</li>`).join("")}</ul>`);
      continue;
    }
    const par = [];
    while (i < linhas.length && linhas[i].trim() && !/^(#|\||\s*[-*] )/.test(linhas[i])) par.push(linhas[i++].replace(/^>\s?/, ""));
    out.push(`<p>${inline(par.join(" "))}</p>`);
  }
  return out.join("\n");
}

function pagina(titulo, corpo) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)} · Segredo do Nome</title>
<meta name="theme-color" content="#0D0D10">
<link rel="stylesheet" href="/css/app.css">
</head>
<body>
<!-- GERADO por web/scripts/gerar.mjs a partir de legal/. Não edite à mão. -->
<div class="app">
  <header class="topo"><a class="marca" href="/"><span class="marca-s" aria-hidden="true">S</span><span>Segredo do Nome</span></a><a class="discreto" href="/">Voltar ao início</a></header>
  <main class="legal">
${corpo}
  </main>
  <footer class="rodape"><nav><a href="/termos">Termos de Uso</a><a href="/privacidade">Privacidade</a><a href="/reembolso">Reembolso</a><a href="/contato">Contato</a></nav><p>Conteúdo de entretenimento.</p></footer>
</div>
</body>
</html>
`;
}

const LEGAIS = [
  ["TERMOS_DE_USO.md", "termos.html", "Termos de Uso"],
  ["POLITICA_DE_PRIVACIDADE.md", "privacidade.html", "Política de Privacidade"],
  ["POLITICA_DE_REEMBOLSO.md", "reembolso.html", "Política de Reembolso"],
];
for (const [md, html, titulo] of LEGAIS) {
  writeFileSync(web(html), pagina(titulo, markdown(readFileSync(raiz(`legal/${md}`), "utf8"))));
}

// Contato: dados do rodapé obrigatório (legal/TEXTOS_DE_CONSENTIMENTO.md, 8), com os mesmos campos [..].
writeFileSync(
  web("contato.html"),
  pagina(
    "Contato",
    `<h1>Contato</h1>
<p>Dúvidas, reclamações, pedidos de reembolso e pedidos sobre dados pessoais.</p>
<ul>
<li><strong>E-mail:</strong> qvnads@gmail.com</li>
<li><strong>WhatsApp:</strong> (11) 99191-2707</li>
<li><strong>Privacidade (encarregado):</strong> qvnads@gmail.com</li>
<li><strong>Empresa:</strong> QVN ADS · CNPJ 31.535.502/0001-40 · Rua Galeno de Castro, São Paulo/SP</li>
</ul>
<p>Para reembolso, informe o número do pagamento que aparece no comprovante na tela (ou no comprovante do Pix no seu banco). Respondemos em até 5 dias úteis.</p>`,
  ),
);

console.log("gerados: js/micro-revelacoes.js, termos.html, privacidade.html, reembolso.html, contato.html");
