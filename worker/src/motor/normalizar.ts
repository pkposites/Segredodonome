// Normalização do nome (ESPECIFICACAO.md, 4.2).

const PARTICULAS = new Set(["de", "da", "do", "das", "dos", "e", "di", "du", "del", "van", "von"]);

export interface NomeNormalizado {
  /** Palavras normalizadas (só a–z), sem partículas, separadas por um espaço. */
  normalizado: string;
  /** Todas as letras do nome normalizado, sem espaços. */
  letras: string;
  /** Primeiro nome como a pessoa digitou (com acentos), para exibição. */
  primeiroNome: string;
}

export function removerAcentos(texto: string): string {
  return texto.normalize("NFD").replace(/\p{M}/gu, "");
}

/** Devolve null quando sobram menos de 2 letras (pedir para revisar o nome). */
export function normalizarNome(entrada: string): NomeNormalizado | null {
  const limpo = entrada.trim().replace(/\s+/g, " ");
  const palavras = removerAcentos(limpo.toLowerCase())
    .replace(/[-'’`´]/g, " ")
    .split(" ")
    .map((p) => p.replace(/[^a-z]/g, ""))
    .filter((p) => p.length > 0 && !PARTICULAS.has(p));

  const normalizado = palavras.join(" ");
  const letras = palavras.join("");
  if (letras.length < 2) return null;

  return { normalizado, letras, primeiroNome: primeiroNomeExibido(limpo) };
}

function primeiroNomeExibido(limpo: string): string {
  // Primeira palavra com pelo menos uma letra; hífen mantido (Ana-Paula).
  const palavra = limpo.split(" ").find((p) => /\p{L}/u.test(p)) ?? limpo;
  const soLetras = palavra.replace(/[^\p{L}'’-]/gu, "");
  const base = soLetras.length > 0 ? soLetras : palavra;
  return base.charAt(0).toLocaleUpperCase("pt-BR") + base.slice(1);
}
