// Perguntas de comportamento (content/GUIA_DE_CONTEUDO.md, 4). A ORDEM das opções é fixa e
// é a mesma que o Worker usa: 0 = ação+emoção, 1 = ação+razão, 2 = reflexão+emoção, 3 = reflexão+razão.

/** Opção com marca de gênero: { ela, ele, neutro }. */
const f = (ela, ele, neutro) => ({ ela, ele, neutro });

export const PERGUNTAS = [
  {
    titulo: "Quando algo dá errado, você…",
    opcoes: [
      "Resolve na hora, no calor do momento",
      "Faz um plano e já parte para a solução",
      "Precisa de um tempo para sentir tudo primeiro",
      "Para e analisa o que causou aquilo",
    ],
  },
  {
    titulo: "Numa festa onde conhece pouca gente, você…",
    opcoes: [
      "Puxa conversa e logo está rindo com alguém",
      "Vai direto até quem pode render uma boa conversa",
      "Fica perto de quem já gosta e observa o clima",
      "Observa, entende o ambiente e só depois chega",
    ],
  },
  {
    titulo: "Numa decisão importante, quem fala mais alto é…",
    opcoes: [
      "O coração, na hora",
      "Os fatos, e você decide rápido",
      "O coração, depois de pensar muito",
      "A lista de prós e contras, sem pressa",
    ],
  },
  {
    titulo: "O que mais te tira do sério?",
    opcoes: ["Gente fria que não se importa", "Enrolação e falta de atitude", "Ser mal interpretado", "Bagunça e falta de lógica"],
  },
  {
    titulo: "Como as pessoas próximas te descrevem?",
    opcoes: [
      f("Intensa, de verdade", "Intenso, de verdade", "Uma pessoa intensa, de verdade"),
      f("Determinada, resolve tudo", "Determinado, resolve tudo", "Uma pessoa determinada, que resolve tudo"),
      "Sensível, enxerga o que ninguém vê",
      f("Calma, o porto seguro do grupo", "Calmo, o porto seguro do grupo", "Uma pessoa calma, o porto seguro do grupo"),
    ],
  },
];

export function textoOpcao(opcao, tratamento) {
  return typeof opcao === "string" ? opcao : opcao[tratamento] ?? opcao.neutro;
}
