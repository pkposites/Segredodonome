// Formato dos arquivos de content/nome/ (GUIA_DE_CONTEUDO.md, 7).
import type { TemperamentoId, Eixo } from "../motor/temperamento";

/** Texto neutro, ou as três formas quando há marca de gênero. */
export type Texto = string | { ela: string; ele: string; neutro: string };

/** Uma redação = lista de parágrafos. */
export type Redacao = Texto[];

export type PorTemperamento<T> = Record<TemperamentoId, T>;

export interface ArquivoArquetipo {
  content_version: string;
  numero: number;
  arquetipo: { nome: string; palavras_guia: string[] };
  do_arquetipo: {
    essencia: PorTemperamento<Redacao[]>;
    caracteristicas: Texto[][];
    como_ama: PorTemperamento<Redacao>;
    dinheiro_trabalho: PorTemperamento<Redacao>;
    frase_do_nome: PorTemperamento<Texto>;
  };
  do_numero: {
    coracao: Redacao[];
    imagem: Redacao[];
    ponto_cego: Redacao[];
  };
}

export interface ArquivoComum {
  content_version: string;
  /** a–z → redação da seção "A força da sua inicial". */
  iniciais: Record<string, Redacao>;
  /** "1"–"9" → 4 textos, um por trimestre de 2027. */
  ciclo_2027: Record<string, Texto[]>;
  /** Frases do "Seu jeito": temperamento × eixo citado × opção escolhida (0–3). */
  frases_temperamento: PorTemperamento<Record<Eixo, Texto[]>>;
  como_chegamos: Texto[];
  micro_revelacoes: Texto[];
}

export interface Biblioteca {
  versao: string;
  arquetipos: Record<number, ArquivoArquetipo>;
  comum: ArquivoComum;
}
