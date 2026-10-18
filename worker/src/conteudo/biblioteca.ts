// Bibliotecas de texto disponíveis, por content_version. Ao lançar uma versão nova,
// mantenha as anteriores aqui: o passe de quem comprou guarda a versão com que comprou.
import a1 from "../../../content/nome/arquetipo-1.json";
import a2 from "../../../content/nome/arquetipo-2.json";
import a3 from "../../../content/nome/arquetipo-3.json";
import a4 from "../../../content/nome/arquetipo-4.json";
import a5 from "../../../content/nome/arquetipo-5.json";
import a6 from "../../../content/nome/arquetipo-6.json";
import a7 from "../../../content/nome/arquetipo-7.json";
import a8 from "../../../content/nome/arquetipo-8.json";
import a9 from "../../../content/nome/arquetipo-9.json";
import comum from "../../../content/nome/comum.json";
import type { ArquivoArquetipo, ArquivoComum, Biblioteca } from "./tipos";

export const CONTENT_VERSION = "2026-10-a";

const v2026_10_a: Biblioteca = {
  versao: "2026-10-a",
  arquetipos: Object.fromEntries(
    [a1, a2, a3, a4, a5, a6, a7, a8, a9].map((a) => [a.numero, a as unknown as ArquivoArquetipo]),
  ),
  comum: comum as unknown as ArquivoComum,
};

const BIBLIOTECAS: Record<string, Biblioteca> = { [v2026_10_a.versao]: v2026_10_a };

export function biblioteca(versao: string = CONTENT_VERSION): Biblioteca | undefined {
  return BIBLIOTECAS[versao];
}

export function todasAsVersoes(): string[] {
  return Object.keys(BIBLIOTECAS);
}
