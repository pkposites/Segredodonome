// Detalhes concretos usados nos textos (ESPECIFICACAO.md, 4.8).
import type { NomeNormalizado } from "./normalizar";
import type { DataPartes } from "./calculo";

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export interface Variaveis {
  primeiro_nome: string;
  inicial: string;
  qtd_letras: string;
  letra_mais_repetida: string;
  qtd_letra_mais_repetida: string;
  comeca_com_vogal: string;
  mes_aniversario: string;
}

export const NOMES_VARIAVEIS: readonly (keyof Variaveis)[] = [
  "primeiro_nome", "inicial", "qtd_letras", "letra_mais_repetida",
  "qtd_letra_mais_repetida", "comeca_com_vogal", "mes_aniversario",
];

/** Variáveis que só fazem sentido quando alguma letra se repete. */
export const VARIAVEIS_DE_REPETICAO = ["letra_mais_repetida", "qtd_letra_mais_repetida"] as const;

export function letraMaisRepetida(letras: string): { letra: string; qtd: number } {
  const contagem = new Map<string, number>();
  for (const l of letras) contagem.set(l, (contagem.get(l) ?? 0) + 1);
  // Empate: vence a que aparece primeiro no nome (Map preserva a ordem de inserção).
  let melhor = { letra: letras.charAt(0), qtd: 0 };
  for (const [letra, qtd] of contagem) if (qtd > melhor.qtd) melhor = { letra, qtd };
  return melhor;
}

export function calcularVariaveis(nome: NomeNormalizado, data: DataPartes): Variaveis & { repete: boolean } {
  const { letra, qtd } = letraMaisRepetida(nome.letras);
  const inicial = nome.letras.charAt(0);
  return {
    primeiro_nome: nome.primeiroNome,
    inicial: inicial.toUpperCase(),
    qtd_letras: String(nome.letras.length),
    letra_mais_repetida: letra.toUpperCase(),
    qtd_letra_mais_repetida: String(qtd),
    comeca_com_vogal: "aeiou".includes(inicial) ? "uma vogal" : "uma consoante",
    mes_aniversario: MESES[data.mes - 1]!,
    repete: qtd >= 2,
  };
}

export function usaVariavelDeRepeticao(texto: string): boolean {
  return VARIAVEIS_DE_REPETICAO.some((v) => texto.includes(`{${v}}`));
}

export function substituir(texto: string, vars: Variaveis): string {
  return texto.replace(/\{([a-z_]+)\}/g, (inteiro, nome: string) =>
    nome in vars ? vars[nome as keyof Variaveis] : inteiro,
  );
}
