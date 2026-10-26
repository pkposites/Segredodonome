// Bônus "Compatibilidade do casal" (decisão de 25/10/2026 em docs/DECISOES.md).
// Leitura curta e genérica, só para quem comprou. Determinística: mesmas duas entradas = mesmo texto.
// Nenhum dado da outra pessoa é guardado: ela só existe em memória durante a requisição.
import textos from "../../../content/casal/casal.json";
import { calcularNumeros, partesDaData, reduzir, type Numero } from "../motor/calculo";
import type { NomeNormalizado } from "../motor/normalizar";

export const CASAL_CONTENT_VERSION = textos.content_version;

type Chave = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";

/** Nomes das cartas, iguais aos de content/nome/arquetipo-N.json (conferido em teste). */
export const NOMES_CARTAS: Record<Numero, string> = {
  1: "A Chama",
  2: "A Ponte",
  3: "A Voz",
  4: "A Raiz",
  5: "O Vento",
  6: "O Abrigo",
  7: "O Farol",
  8: "O Leme",
  9: "O Horizonte",
};

export interface PessoaDoCasal {
  primeiro_nome: string;
  carta: { numero: Numero; nome: string };
  traz: string;
  pede: string;
}

export interface ResultadoCasal {
  combinacao: string;
  voce: PessoaDoCasal;
  parceria: PessoaDoCasal;
  sintonia: { titulo: string; texto: string };
  frase: string;
  versao: string;
}

function pessoa(nome: NomeNormalizado, dataIso: string) {
  const n = calcularNumeros(nome.letras, partesDaData(dataIso));
  const k = String(n.expressao) as Chave;
  const p: PessoaDoCasal = {
    primeiro_nome: nome.primeiroNome,
    carta: { numero: n.expressao, nome: NOMES_CARTAS[n.expressao] },
    traz: textos.cartas[k].traz,
    pede: textos.cartas[k].pede,
  };
  return { p, caminho: n.caminho };
}

export function montarCasal(
  voce: { nome: NomeNormalizado; data: string },
  parceria: { nome: NomeNormalizado; data: string },
): ResultadoCasal {
  const a = pessoa(voce.nome, voce.data);
  const b = pessoa(parceria.nome, parceria.data);
  const mesma = a.p.carta.numero === b.p.carta.numero;
  const sintonia = mesma ? textos.mesma_carta : textos.sintonias[String(reduzir(a.p.carta.numero + b.p.carta.numero)) as Chave];
  return {
    combinacao: `${a.p.carta.nome} + ${b.p.carta.nome}`,
    voce: a.p,
    parceria: b.p,
    sintonia: { titulo: sintonia.titulo, texto: sintonia.texto },
    frase: textos.frases[String(reduzir(a.caminho + b.caminho)) as Chave],
    versao: CASAL_CONTENT_VERSION,
  };
}
