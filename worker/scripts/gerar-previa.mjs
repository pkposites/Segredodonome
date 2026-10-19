// Monta a pasta da PRÉVIA com modo demonstração: cópia de web/ + js/demo-api.js
// (motor e textos empacotados para o navegador) + cabeçalho noindex.
// Uso: node scripts/gerar-previa.mjs <pasta-de-saida>
// A pasta web/ (produção) não é alterada e nunca recebe o demo-api.js.
import { cpSync, rmSync, appendFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const saida = process.argv[2];
if (!saida) throw new Error("Informe a pasta de saída");
const web = fileURLToPath(new URL("../../web", import.meta.url));

rmSync(saida, { recursive: true, force: true });
cpSync(web, saida, { recursive: true, filter: (p) => !/\/(referencia-visual|scripts|painel)(\/|$)|TELAS\.md$/.test(p) });
await build({
  entryPoints: [fileURLToPath(new URL("../src/demo.ts", import.meta.url))],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  minify: true,
  outfile: `${saida}/js/demo-api.js`,
});
appendFileSync(`${saida}/_headers`, "\n/*\n  X-Robots-Tag: noindex, nofollow\n");
writeFileSync(`${saida}/netlify.toml`, '# Prévia com modo demonstração: publica esta pasta como está, sem build.\n[build]\n  publish = "."\n  command = ""\n');
console.log(`prévia montada em ${saida}`);
