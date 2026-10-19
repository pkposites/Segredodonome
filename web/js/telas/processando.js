// Processando (web/TELAS.md, 4): até 4 s, "Pular", direto com movimento reduzido.
// POST /resultado acontece durante a animação.
import { h, svg, trocar, movimentoReduzido, esperar, primeiroNomeDe } from "../dom.js";
import { local, sessao } from "../armazenamento.js";
import { post } from "../api.js";

const ARCO =
  '<svg viewBox="0 0 168 168" fill="none"><circle cx="84" cy="84" r="76" stroke="var(--borda)" stroke-width="6"/><path class="arco" d="M84 8a76 76 0 0 1 76 76" stroke="var(--nome)" stroke-width="6" stroke-linecap="round"/></svg>';

const FRASES = ["Lendo as letras do seu nome…", "Cruzando com a sua data…", "Montando o seu resultado…"];

export function telaProcessando(tela, { ir, entradas, aoFalhar }) {
  const inicial = primeiroNomeDe(entradas.nome).charAt(0).toLocaleUpperCase("pt-BR");
  const frase = h("p", { class: "frase-proc", "aria-live": "polite" }, FRASES[0]);
  let pular = false;
  const botaoPular = h("button", { class: "botao-texto", type: "button", onclick: () => (pular = true) }, "Pular");
  trocar(
    tela,
    h(
      "div",
      { class: "processando" },
      h(
        "div",
        { class: "mostrador", "aria-hidden": "true" },
        svg(ARCO),
        h("div", { class: "centro" }, inicial),
      ),
      frase,
      botaoPular,
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
