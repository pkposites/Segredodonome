// Valida todas as versões da biblioteca de textos. Sai com código 1 se houver erro.
// Uso: npm run validar-conteudo
import { biblioteca, todasAsVersoes } from "../src/conteudo/biblioteca";
import { validarBiblioteca } from "../src/conteudo/validar";

let falhou = false;
for (const versao of todasAsVersoes()) {
  const { erros, avisos } = validarBiblioteca(biblioteca(versao)!);
  console.log(`\nBiblioteca ${versao}: ${erros.length} erro(s), ${avisos.length} aviso(s)`);
  for (const e of erros) console.log(`  ERRO  ${e}`);
  for (const a of avisos) console.log(`  aviso ${a}`);
  if (erros.length) falhou = true;
}
process.exit(falhou ? 1 : 0);
