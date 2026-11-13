// Entrada (/) e escolha da descoberta — v2 "jogo de descoberta" (docs/REDESIGN_V2.md).
// Primeira dobra: headline → letras que acendem com o nome → campo → botão.
import { h, svg, trocar, movimentoReduzido, ICONES } from "../dom.js";
import { emblema } from "../emblemas.js";
import { local } from "../armazenamento.js";
import { CONFIG } from "../config.js";

const EXEMPLOS = ["Ana", "Léo", "Bruna", "Carlos"];

function letrasDe(texto) {
  return [...String(texto).replace(/[^\p{L}]/gu, "").toLocaleUpperCase("pt-BR")].slice(0, 12);
}

/** Desenha as letras; só a última digitada "acende" (as outras ficam paradas). */
function blocos(alvo, texto, { animarTodas = false, novaNoFim = false } = {}) {
  const letras = letrasDe(texto);
  trocar(
    alvo,
    letras.map((l, i) => {
      const el = h("span", { class: "letra" }, l);
      if (!movimentoReduzido() && (animarTodas || (novaNoFim && i === letras.length - 1))) {
        el.classList.add("pulsa");
        if (animarTodas) el.style.animationDelay = `${i * 70}ms`;
      }
      return el;
    }),
  );
}

export function telaInicio(tela, { ir }) {
  const salvo = local.ler("passe") || local.ler("entradas");
  const nomeSalvo = local.ler("primeiro_nome");
  const letras = h("div", { class: "letras letras-hero", "aria-hidden": "true" });
  const seloExemplo = h("span", { class: "selo selo-exemplo" }, "exemplo");
  // Exemplo em loop (≤ 6 s por volta, pausável). O nome é pedido uma vez só, já no quiz.
  let i = 0;
  let pausado = movimentoReduzido();
  let timer = null;
  const botaoPausa = h("button", { class: "icone-botao", type: "button", "aria-label": "Pausar animação" }, svg(ICONES.pausa));
  const tick = () => blocos(letras, EXEMPLOS[i++ % EXEMPLOS.length], { animarTodas: true });
  const iniciar = () => {
    clearInterval(timer);
    if (!pausado) timer = setInterval(tick, 1500);
  };
  botaoPausa.addEventListener("click", () => {
    pausado = !pausado;
    botaoPausa.replaceChildren(svg(pausado ? ICONES.play : ICONES.pausa));
    botaoPausa.setAttribute("aria-label", pausado ? "Retomar animação" : "Pausar animação");
    iniciar();
  });

  tick();
  iniciar();

  const form = h(
    "div",
    { class: "hero-form" },
    h(
      "a",
      { class: "botao botao-principal botao-hero", href: "/quiz", "data-link": true },
      "Começar minha descoberta",
      svg(ICONES.brilho),
    ),
    h("p", { class: "hero-confianca" }, "Grátis pra começar · Sem cadastro · O nome é pedido uma vez só"),
  );

  trocar(
    tela,
    salvo && nomeSalvo
      ? h("a", { class: "faixa-salvo", href: "/r", "data-link": true }, h("span", {}, `${nomeSalvo}, sua carta está guardada`), h("strong", {}, "abrir →"))
      : null,
    h(
      "section",
      { class: "hero", "aria-labelledby": "hero-titulo" },
      h("span", { class: "hero-selo" }, svg(ICONES.brilho), "Jogo de descoberta · 2 minutos"),
      h("h1", { class: "hero-titulo", id: "hero-titulo" }, "Seu nome esconde uma história. ", h("span", { class: "gradiente-texto" }, "Vamos descobrir?")),
      h("p", { class: "hero-sub" }, "Uma experiência divertida para explorar as letras do seu nome e descobrir com qual arquétipo você mais combina."),
      h("div", { class: "hero-letras" }, letras, h("div", { class: "hero-controles" }, seloExemplo, botaoPausa)),
      form,
    ),
    h(
      "div",
      { class: "carta carta-suave" },
      h("span", { class: "rotulo" }, "Exemplo de carta"),
      h(
        "div",
        { class: "linha" },
        h("div", { class: "emblema-caixa" }, svg(emblema(7, 52))),
        h("div", { class: "pilha-8" }, h("span", { class: "arq-mini" }, "O Farol"), h("span", { class: "mini" }, "Jeito magnético · 1 de 9 arquétipos")),
      ),
      h("hr", { class: "divisor" }),
      h("span", { class: "pequeno texto-2" }, "“Você percebe o que está por trás das palavras e só fala quando tem certeza.”"),
    ),
    h(
      "section",
      { id: "como", class: "pilha", "aria-labelledby": "como-titulo" },
      h("h2", { class: "secao", id: "como-titulo" }, "Como funciona"),
      h(
        "div",
        { class: "passos" },
        h("div", { class: "passo" }, h("b", {}, "1"), "Seu nome e sua data"),
        h("div", { class: "passo" }, h("b", {}, "2"), "5 escolhas rápidas"),
        h("div", { class: "passo" }, h("b", {}, "3"), "Sua carta, grátis"),
      ),
      h("p", { class: "pequeno apoio" }, "É uma interpretação lúdica feita a partir das letras do seu nome, da sua data de nascimento e das suas respostas. É entretenimento: não é avaliação psicológica nem previsão."),
    ),
    h(
      "section",
      { class: "pilha-8", "aria-labelledby": "faq-titulo" },
      h("h2", { class: "secao", id: "faq-titulo" }, "Perguntas frequentes"),
      faq("É pago?", `A sua carta, com o arquétipo e a interpretação, é grátis. Se quiser, você libera os capítulos extras, com PDF, por ${CONFIG.PRECO_TEXTO} no Pix, pagamento único. A Compatibilidade do casal é um adicional opcional de ${CONFIG.PRECO_CASAL_TEXTO}.`),
      faq("Quanto tempo leva?", "Cerca de 2 minutos: nome, data de nascimento e 5 escolhas rápidas."),
      faq("Meus dados ficam salvos?", "Seu nome, sua data e suas respostas ficam neste aparelho. Na tela do Pix, se você autorizar, guardamos o WhatsApp por até 7 dias só para te enviar o link daquele pagamento, e apagamos quando você paga ou quando o prazo acaba."),
      faq("Posso refazer?", "Pode. Com o mesmo nome e a mesma data, o seu nome continua dizendo a mesma coisa. Se você já comprou, refazer com os mesmos dados recupera a sua compra."),
      faq("É só para maiores de 18?", "Sim. O quiz não é processado para menores de 18 anos."),
    ),
  );
}

function faq(pergunta, resposta) {
  return h("details", {}, h("summary", {}, pergunta), h("p", {}, resposta));
}

