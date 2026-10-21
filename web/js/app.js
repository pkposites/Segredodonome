// Roteador da página única: /, /quiz, /quiz/parte-2 e /r são URLs reais (cada troca é um
// PageView, RASTREAMENTO_META.md, 2). Páginas legais são arquivos HTML separados.
import { CONFIG } from "./config.js";
import { h, trocar } from "./dom.js";
import { MODO_DEMO } from "./api.js";
import { capturarChegada, carregarClarity, definirCookies, escolhaCookies, evento } from "./rastreio.js";
import { montarFundo, botaoEfeitos, limparRevelacao } from "./fundo.js";
import { telaInicio } from "./telas/inicio.js";
import { telaQuiz } from "./telas/quiz.js";
import { telaResultado } from "./telas/resultado.js";

const PAGEVIEW = { "/": "visita", "/quiz": "quiz_inicio", "/quiz/parte-2": "quiz_metade" };

export function ir(caminho, { substituir = false, hash = "" } = {}) {
  const destino = caminho + hash;
  if (location.pathname + location.hash !== destino) {
    history[substituir ? "replaceState" : "pushState"](null, "", destino);
  }
  renderizar();
}

function renderizar() {
  const caminho = location.pathname.replace(/\/+$/, "") || "/";
  const tela = document.getElementById("tela");
  if (PAGEVIEW[caminho]) evento(PAGEVIEW[caminho]);
  document.getElementById("topo").hidden = caminho.startsWith("/quiz");
  if (caminho !== "/r") limparRevelacao();
  if (caminho === "/quiz" || caminho === "/quiz/parte-2") telaQuiz(tela, { ir, parte2: caminho === "/quiz/parte-2" });
  else if (caminho === "/r") telaResultado(tela, { ir });
  else telaInicio(tela, { ir });
  if (!location.hash.startsWith("#como")) window.scrollTo(0, 0);
  tela.focus({ preventScroll: true });
}

function rodape() {
  const v = CONFIG.VENDEDOR;
  trocar(
    document.getElementById("rodape"),
    h("p", {}, `${v.razao_social} · CNPJ ${v.cnpj} · ${v.endereco}`),
    h("p", {}, `${v.email} · WhatsApp ${v.whatsapp}`),
    h(
      "nav",
      { "aria-label": "Documentos" },
      h("a", { href: "/termos" }, "Termos de Uso"),
      h("a", { href: "/privacidade" }, "Privacidade"),
      h("a", { href: "/reembolso" }, "Reembolso"),
      h("a", { href: "/contato" }, "Contato"),
      h("button", { type: "button", onclick: () => bannerCookies(true) }, "Preferências de cookies"),
    ),
    h("p", {}, "Conteúdo de entretenimento. Não é avaliação psicológica, ciência nem previsão do futuro."),
  );
}

/** Aviso de cookies (legal/TEXTOS_DE_CONSENTIMENTO.md, 1): informa o Pixel; Aceitar e Recusar valem só para o Clarity. */
export function bannerCookies(forcar = false) {
  if (!forcar && escolhaCookies()) return;
  document.querySelector(".cookies")?.remove();
  const fechar = (valor) => {
    definirCookies(valor);
    caixa.remove();
  };
  const caixa = h(
    "div",
    { class: "cookies", role: "dialog", "aria-label": "Aviso de cookies" },
    h("p", {}, "Medimos de onde vêm as visitas com o Pixel da Meta. Se você aceitar, também usamos o Microsoft Clarity para ver cliques e rolagem, com todo o texto da tela escondido. ", h("a", { href: "/privacidade" }, "Saiba mais")),
    h(
      "div",
      { class: "linha" },
      h("button", { class: "botao botao-contorno", type: "button", onclick: () => fechar("recusado") }, "Recusar"),
      h("button", { class: "botao botao-contorno", type: "button", onclick: () => fechar("aceito") }, "Aceitar"),
    ),
  );
  document.body.append(caixa);
}

document.addEventListener("click", (e) => {
  const a = e.target.closest?.("a[data-link]");
  if (!a || e.metaKey || e.ctrlKey || e.shiftKey || a.target) return;
  const url = new URL(a.href);
  if (url.origin !== location.origin) return;
  e.preventDefault();
  ir(url.pathname, { hash: url.hash });
});

window.addEventListener("popstate", renderizar);
// PDF: seções recolhíveis saem abertas na impressão.
window.addEventListener("beforeprint", () => document.querySelectorAll("details").forEach((d) => (d.open = true)));

if (MODO_DEMO) {
  document.body.prepend(
    h("div", { class: "faixa-demo", role: "note" }, "DEMONSTRAÇÃO · resultado simulado no navegador · nenhum pagamento é real · ", h("a", { href: "/?demo=0" }, "sair")),
  );
}

montarFundo();
document.getElementById("topo-acoes").prepend(botaoEfeitos());
capturarChegada();
carregarClarity();
rodape();
renderizar();
bannerCookies();
