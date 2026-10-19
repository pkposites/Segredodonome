// Notificações de "pista" entre as etapas. Só textos ligados ao progresso real ou ao nome
// digitado (micro-revelações). Nada de prova social, compra de terceiros ou número inventado.
import { h, svg, ICONES } from "./dom.js";

let atual = null;
let timer = null;

/** icone: letra (ex.: inicial do nome) ou omitido para o brilho. */
export function mostrarPista(texto, { icone, longa = false } = {}) {
  clearTimeout(timer);
  atual?.remove();
  atual = h(
    "div",
    { class: `pista${longa ? " longa" : ""}`, role: "status", "aria-live": "polite" },
    h("span", { class: "pista-icone", "aria-hidden": "true" }, icone ? icone : svg(ICONES.brilho)),
    h("span", {}, texto),
  );
  document.body.append(atual);
  const el = atual;
  timer = setTimeout(() => {
    el.classList.add("saindo");
    setTimeout(() => el.remove(), 320);
  }, longa ? 4600 : 2600);
}

export function esconderPista() {
  clearTimeout(timer);
  atual?.remove();
  atual = null;
}
