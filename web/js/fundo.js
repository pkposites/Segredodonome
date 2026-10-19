// Fundo vivo: névoas que derivam, poucas estrelas e letras translúcidas subindo devagar.
// Tudo atrás do conteúdo (pointer-events: none), só transform/opacity em CSS.
// Desligável pelo botão "Efeitos" (fica lembrado no aparelho) e parado com "reduzir movimento".
import { h, svg } from "./dom.js";
import { local } from "./armazenamento.js";
import { emblema } from "./emblemas.js";

const ESTRELAS = 14;
const LETRAS_VOANDO = 7;
let palco = null;

export const efeitosLigados = () => local.ler("efeitos") !== "desligados";

function aplicarEfeitos() {
  document.documentElement.classList.toggle("sem-efeitos", !efeitosLigados());
}

/** Pseudoaleatório fixo para posições (decoração; nada a ver com o cálculo do resultado). */
function posicoes(n, semente) {
  let x = semente;
  return Array.from({ length: n }, () => {
    x = (x * 9301 + 49297) % 233280;
    return x / 233280;
  });
}

export function montarFundo() {
  if (palco) return;
  const p = posicoes(ESTRELAS * 3, 7);
  palco = h(
    "div",
    { class: "palco", "aria-hidden": "true" },
    h("div", { class: "nevoa n1" }),
    h("div", { class: "nevoa n2" }),
    Array.from({ length: ESTRELAS }, (_, i) => {
      const e = h("span", { class: "estrela" });
      e.style.left = `${(p[i * 3] * 100).toFixed(1)}%`;
      e.style.top = `${(p[i * 3 + 1] * 100).toFixed(1)}%`;
      e.style.animationDelay = `${(p[i * 3 + 2] * 6).toFixed(1)}s`;
      return e;
    }),
    h("div", { class: "voo" }),
    h("div", { class: "simbolo" }),
  );
  document.body.prepend(palco);
  definirLetras("SEGREDO");
  aplicarEfeitos();
  // Aba escondida: nada anima (bateria).
  document.addEventListener("visibilitychange", () => document.documentElement.classList.toggle("pausado", document.hidden));
}

/** Letras que sobem ao fundo: as do nome da pessoa assim que ela digita. */
export function definirLetras(texto) {
  if (!palco) return;
  const letras = [...String(texto).replace(/[^\p{L}]/gu, "").toLocaleUpperCase("pt-BR")];
  if (!letras.length) return;
  const p = posicoes(LETRAS_VOANDO * 3, letras.length + 3);
  palco.querySelector(".voo").replaceChildren(
    ...Array.from({ length: LETRAS_VOANDO }, (_, i) => {
      const el = h("span", { class: "letra-voa" }, letras[i % letras.length]);
      el.style.left = `${(5 + p[i * 3] * 88).toFixed(1)}%`;
      el.style.fontSize = `${Math.round(38 + p[i * 3 + 1] * 70)}px`;
      el.style.animationDelay = `${(-p[i * 3 + 2] * 46).toFixed(1)}s`;
      return el;
    }),
  );
}

/** Momento da revelação: o símbolo do arquétipo aparece bem fraco ao fundo e tudo se aproxima. */
export function revelarNoFundo(numero, tema) {
  if (!palco) return;
  document.documentElement.style.setProperty("--tema", tema);
  palco.querySelector(".simbolo").replaceChildren(svg(emblema(numero, 400, 1)));
  palco.classList.add("revelar");
}

export function limparRevelacao() {
  palco?.classList.remove("revelar");
}

/** Botão do topo para ligar e desligar os efeitos decorativos. */
export function botaoEfeitos() {
  const b = h("button", { class: "efeitos", type: "button", "aria-pressed": String(efeitosLigados()) });
  const pintar = () => {
    const on = efeitosLigados();
    b.setAttribute("aria-pressed", String(on));
    b.setAttribute("aria-label", on ? "Desligar efeitos animados" : "Ligar efeitos animados");
    b.replaceChildren(svg(ICONE_BRILHO), on ? "Efeitos" : "Sem efeitos");
  };
  b.addEventListener("click", () => {
    local.gravar("efeitos", efeitosLigados() ? "desligados" : null);
    aplicarEfeitos();
    pintar();
  });
  pintar();
  return b;
}

const ICONE_BRILHO =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" opacity=".7"/></svg>';
