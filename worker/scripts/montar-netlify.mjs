// Build do Netlify para os dois sites que usam este repositório:
//  - segredo-do-nome-previa → web/ + modo demonstração (gerar-previa.mjs)
//  - qualquer outro site (o oficial) → só web/, sem o pacote da demonstração
// O Netlify informa o nome do site em SITE_NAME. Saída sempre em ../publicar.
import { cpSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SITE_PREVIA = "segredo-do-nome-previa";
const saida = fileURLToPath(new URL("../../publicar", import.meta.url));
const web = fileURLToPath(new URL("../../web", import.meta.url));

if (process.env.SITE_NAME === SITE_PREVIA) {
  execFileSync(process.execPath, [fileURLToPath(new URL("./gerar-previa.mjs", import.meta.url)), saida], { stdio: "inherit" });
} else {
  rmSync(saida, { recursive: true, force: true });
  cpSync(web, saida, { recursive: true, filter: (p) => !/\/(referencia-visual|scripts|painel)(\/|$)|TELAS\.md$/.test(p) });
  console.log(`site oficial montado em ${saida} (sem demonstração)`);
}
