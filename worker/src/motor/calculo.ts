// Cálculo dos números (ESPECIFICACAO.md, 4.3). Interno: nunca exibido como fórmula.

const TABELA: Record<string, number> = {};
["ajs", "bkt", "clu", "dmv", "enw", "fox", "gpy", "hqz", "ir"].forEach((grupo, i) => {
  for (const letra of grupo) TABELA[letra] = i + 1;
});

const VOGAIS = new Set(["a", "e", "i", "o", "u"]);

export type Numero = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export function valorLetra(letra: string): number {
  const v = TABELA[letra];
  if (v === undefined) throw new Error(`Letra fora da tabela: ${letra}`);
  return v;
}

/** Soma os dígitos repetidamente até sobrar 1–9. Sem números mestres. */
export function reduzir(n: number): Numero {
  if (!Number.isInteger(n) || n < 1) throw new Error(`reduzir espera inteiro ≥ 1, recebeu ${n}`);
  let atual = n;
  while (atual > 9) {
    atual = String(atual)
      .split("")
      .reduce((s, d) => s + Number(d), 0);
  }
  return atual as Numero;
}

function somar(letras: string, filtro: (l: string) => boolean): number {
  let total = 0;
  for (const l of letras) if (filtro(l)) total += valorLetra(l);
  return total;
}

export interface Numeros {
  expressao: Numero;
  coracao: Numero;
  imagem: Numero;
  caminho: Numero;
  ciclo2027: Numero;
  inicial: string;
}

export interface DataPartes {
  dia: number;
  mes: number;
  ano: number;
}

export function partesDaData(iso: string): DataPartes {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return { dia: dia!, mes: mes!, ano: ano! };
}

/**
 * `letras`: letras do nome normalizado (a–z, sem espaços).
 * Nome sem vogais (ou sem consoantes) cai em 9 pela soma zero → tratado como reduzir(9).
 */
export function calcularNumeros(letras: string, data: DataPartes): Numeros {
  const total = somar(letras, () => true);
  const vogais = somar(letras, (l) => VOGAIS.has(l));
  const consoantes = somar(letras, (l) => !VOGAIS.has(l));
  const rd = reduzir(data.dia);
  const rm = reduzir(data.mes);
  return {
    expressao: reduzir(total),
    coracao: reduzirOuNove(vogais),
    imagem: reduzirOuNove(consoantes),
    caminho: reduzir(rd + rm + reduzir(data.ano)),
    ciclo2027: reduzir(rd + rm + reduzir(2027)),
    inicial: letras.charAt(0),
  };
}

// Soma zero só acontece em nomes sem vogais ou sem consoantes (ex.: "Ai", "Brr").
// Regra fixa e determinística, apontada na auditoria da Fase 0.
function reduzirOuNove(n: number): Numero {
  return n === 0 ? 9 : reduzir(n);
}
