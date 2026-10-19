// Processando: as letras do nome giram em volta do verso da carta enquanto o Worker monta o
// resultado. Até 4 s, com "Pular"; direto com movimento reduzido. As frases descrevem o que
// de fato acontece (letras, data, montagem), sem simular processos que não existem.
import { h, trocar, movimentoReduzido, esperar } from "../dom.js";
import { local, sessao } from "../armazenamento.js";
import { post } from "../api.js";
import { esconderPista } from "../pistas.js";

const FRASES = ["Lendo as letras do seu nome…", "Cruzando com a sua data…", "Montando a sua carta…"];

export function telaProcessando(tela, { ir, entradas, aoFalhar }) {
  esconderPista();
  const letras = [...entradas.nome.replace(/[^\p{L}]/gu, "").toLocaleUpperCase("pt-BR")].slice(0, 10);
  const anel = h("div", { class: "anel" });
  letras.forEach((l, i) => {
    const el = h("span", { class: "letra" }, l);
    const ang = (360 / letras.length) * i;
    el.style.transform = `rotate(${ang}deg) translateY(-96px) rotate(${-ang}deg)`;
    anel.append(el);
  });
  const frase = h("p", { class: "frase-proc", "aria-live": "polite" }, FRASES[0]);
  let pular = false;
  trocar(
    tela,
    h(
      "div",
      { class: "processando" },
      h("div", { class: "orbita", "aria-hidden": "true" }, anel, h("div", { class: "verso" })),
      frase,
      h("button", { class: "botao-texto", type: "button", onclick: () => (pular = true) }, "Pular"),
    ),
  );

  const chamada = post("/resultado", { entradas });
  const animacao = (async () => {
    if (movimentoReduzido()) return;
    for (let i = 0; i < 8 && !pular; i++) {
      await esperar(500);
      frase.textContent = FRASES[Math.min(2, Math.floor(i / 3))];
    }
  })();

  Promise.all([chamada, animacao])
    .then(([resultado]) => {
      local.gravar("entradas", entradas);
      local.gravar("primeiro_nome", resultado.gratis.primeiro_nome);
      sessao.gravar("quiz", null);
      sessao.gravar("resultado", resultado);
      sessao.gravar("revelar", true); // a próxima tela mostra a carta virando
      ir("/r");
    })
    .catch((erro) => {
      trocar(
        tela,
        h(
          "div",
          { class: "processando" },
          h("p", { class: "erro", role: "alert" }, erro.message),
          h("button", { class: "botao botao-principal", type: "button", onclick: aoFalhar }, "Revisar respostas"),
          erro.codigo === "idade" ? null : h("button", { class: "botao botao-contorno", type: "button", onclick: () => telaProcessando(tela, { ir, entradas, aoFalhar }) }, "Tentar de novo"),
        ),
      );
    });
}
