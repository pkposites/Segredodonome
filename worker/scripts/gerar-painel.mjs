// Copia web/painel/index.html para src/painel/gerado.ts, para o Worker servir /painel
// atrás do Cloudflare Access. Rode depois de editar o painel: npm run gerar-painel
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const raiz = new URL("../", import.meta.url);
const html = readFileSync(fileURLToPath(new URL("../web/painel/index.html", raiz)), "utf8");
writeFileSync(
  fileURLToPath(new URL("src/painel/gerado.ts", raiz)),
  `// GERADO por scripts/gerar-painel.mjs a partir de web/painel/index.html. Não edite à mão.\nexport default ${JSON.stringify(html)};\n`,
);
console.log("src/painel/gerado.ts atualizado");
