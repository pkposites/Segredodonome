// Temperamento (ESPECIFICACAO.md, 4.5 e GUIA_DE_CONTEUDO.md, 3 e 4).
// Toda pergunta tem as opções na mesma ordem: 0 = A+E, 1 = A+Z, 2 = R+E, 3 = R+Z.

export type TemperamentoId = "intenso" | "estrategico" | "sereno" | "magnetico";
export type Eixo = "acao_reflexao" | "emocao_razao";

export const NOMES_TEMPERAMENTO: Record<TemperamentoId, string> = {
  intenso: "Intenso",
  estrategico: "Estratégico",
  sereno: "Sereno",
  magnetico: "Magnético",
};

export const TOTAL_PERGUNTAS = 5;

/** Pergunta (índice 0–4) citada para cada eixo. */
const PERGUNTA_DO_EIXO: Record<Eixo, number> = {
  acao_reflexao: 0, // pergunta 1
  emocao_razao: 2, // pergunta 3
};

export interface Placar {
  acao: number;
  reflexao: number;
  emocao: number;
  razao: number;
}

export interface Temperamento {
  id: TemperamentoId;
  placar: Placar;
  /** Eixo da resposta citada no resultado grátis. */
  eixoCitado: Eixo;
  /** Índice (0–4) da pergunta citada. */
  perguntaCitada: number;
  /** Opção (0–3) que a pessoa escolheu na pergunta citada. */
  opcaoCitada: number;
}

export const ehAcao = (opcao: number) => opcao === 0 || opcao === 1;
export const ehEmocao = (opcao: number) => opcao === 0 || opcao === 2;

export function calcularTemperamento(respostas: readonly number[]): Temperamento {
  if (respostas.length !== TOTAL_PERGUNTAS) throw new Error("São 5 respostas");
  for (const r of respostas) {
    if (!Number.isInteger(r) || r < 0 || r > 3) throw new Error("Resposta fora de 0–3");
  }

  const acao = respostas.filter(ehAcao).length;
  const emocao = respostas.filter(ehEmocao).length;
  const placar: Placar = {
    acao,
    reflexao: TOTAL_PERGUNTAS - acao,
    emocao,
    razao: TOTAL_PERGUNTAS - emocao,
  };

  const venceAcao = acao >= 3;
  const venceEmocao = emocao >= 3;
  const id: TemperamentoId = venceAcao
    ? venceEmocao
      ? "intenso"
      : "estrategico"
    : venceEmocao
      ? "magnetico"
      : "sereno";

  // Regra do GUIA_DE_CONTEUDO.md, 4: cita o eixo com placar mais apertado (3×2);
  // empate de aperto → pergunta 3 (eixo emoção/razão).
  const margemAR = Math.abs(acao - placar.reflexao);
  const margemER = Math.abs(emocao - placar.razao);
  const eixoCitado: Eixo = margemAR < margemER ? "acao_reflexao" : "emocao_razao";
  const perguntaCitada = PERGUNTA_DO_EIXO[eixoCitado];

  return { id, placar, eixoCitado, perguntaCitada, opcaoCitada: respostas[perguntaCitada]! };
}
