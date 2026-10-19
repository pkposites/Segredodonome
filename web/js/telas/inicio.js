// Entrada (/) e escolha da descoberta — v2 "jogo de descoberta" (docs/REDESIGN_V2.md).
// Primeira dobra: headline → letras que acendem com o nome → campo → botão.
import { h, svg, trocar, movimentoReduzido, primeiroNomeDe, esperar, ICONES } from "../dom.js";
import { emblema, ARTE_NOME, ARTE_CASAL } from "../emblemas.js";
import { local, sessao } from "../armazenamento.js";
import { evento } from "../rastreio.js";
import { definirLetras } from "../fundo.js";

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
  const campo = h("input", {
    id: "primeiro-nome", class: "campo campo-hero", name: "primeiro-nome", placeholder: "Seu primeiro nome",
    autocomplete: "given-name", autocapitalize: "words", maxlength: "40", enterkeyhint: "go",
    value: sessao.ler("primeiro_nome") ?? "",
  });
  const erro = h("p", { class: "erro", role: "alert" });

  // Exemplo em loop (≤ 6 s por volta, pausável); para quando a pessoa digita.
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

  let anterior = "";
  function aoDigitar() {
    erro.textContent = "";
    const v = campo.value.trim();
    if (v) {
      clearInterval(timer);
      seloExemplo.hidden = botaoPausa.hidden = true;
      blocos(letras, v, { novaNoFim: v.length > anterior.length });
      definirLetras(v);
    } else {
      seloExemplo.hidden = botaoPausa.hidden = false;
      iniciar();
    }
    anterior = v;
  }
  campo.addEventListener("input", aoDigitar);
  if (campo.value) aoDigitar();
  else {
    tick();
    iniciar();
  }

  async function continuar(e) {
    e.preventDefault();
    const nome = primeiroNomeDe(campo.value);
    if (letrasDe(nome).length < 2) {
      erro.textContent = "Digite o seu primeiro nome para começar.";
      campo.focus();
      return;
    }
    clearInterval(timer);
    sessao.gravar("primeiro_nome", nome);
    // As letras se reorganizam rapidamente antes da escolha (curto, sem esperar a pessoa).
    if (!movimentoReduzido()) {
      blocos(letras, nome);
      [...letras.children].forEach((l, k) => {
        l.style.setProperty("--giro", `${(k % 2 ? -1 : 1) * (4 + k * 2)}deg`);
        l.style.animationDelay = `${k * 40}ms`;
      });
      letras.classList.add("reorganizar");
      await esperar(480);
    }
    telaEscolha(tela, { ir, nome });
  }

  const form = h(
    "form",
    { class: "hero-form", onsubmit: continuar, novalidate: true },
    h("label", { class: "hero-rotulo", for: "primeiro-nome" }, "Qual é o seu primeiro nome?"),
    campo,
    erro,
    h("button", { class: "botao botao-principal botao-hero", type: "submit" }, "Começar minha descoberta", svg(ICONES.brilho)),
    h("p", { class: "hero-confianca" }, "Grátis pra começar · Sem cadastro · Não guardamos seu nome nem sua data"),
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
      faq("É pago?", "A sua carta, com o arquétipo e a interpretação, é grátis e completa. Se quiser, você pode liberar os capítulos extras, com PDF, por R$ 11,90 no Pix, pagamento único."),
      faq("Quanto tempo leva?", "Cerca de 2 minutos: nome, data de nascimento e 5 escolhas rápidas."),
      faq("Meus dados ficam salvos?", "Não no nosso servidor. Seu nome, sua data e suas respostas ficam neste aparelho e dentro do seu link de acesso, que é criptografado. Nosso sistema usa esses dados só no momento de montar o resultado. Você pode apagar tudo do aparelho quando quiser."),
      faq("Posso refazer?", "Pode. Com o mesmo nome e a mesma data, o seu nome continua dizendo a mesma coisa. Se você já comprou, refazer com os mesmos dados recupera a sua compra."),
      faq("É só para maiores de 18?", "Sim. O quiz não é processado para menores de 18 anos."),
    ),
  );
}

function faq(pergunta, resposta) {
  return h("details", {}, h("summary", {}, pergunta), h("p", {}, resposta));
}

function telaEscolha(tela, { ir, nome }) {
  const avisoCasal = h("p", { class: "pequeno", role: "status" });
  const botaoCasal = h(
    "button",
    {
      class: "botao-casal",
      type: "button",
      onclick: () => {
        evento("casal_interesse");
        botaoCasal.disabled = true;
        avisoCasal.textContent = "Anotado! Não pedimos contato; o lançamento será divulgado no site e nas redes.";
      },
    },
    "Quero quando lançar",
  );
  const cartaNome = h(
    "a",
    { class: "carta-jogo", href: "/quiz" },
    h("span", { class: "selo selo-gratis" }, "Grátis para começar"),
    h("div", { class: "carta-arte dourado" }, h("span", { class: "brilho-giro", "aria-hidden": "true" }), svg(ARTE_NOME)),
    h("h2", {}, "Segredo do nome"),
    h("p", { class: "texto-2 pequeno" }, "Descubra a carta do seu arquétipo e o que as letras do seu nome contam sobre o seu jeito."),
    h("div", { class: "chips" }, h("span", { class: "chip" }, "Seu arquétipo"), h("span", { class: "chip" }, "Amor e dinheiro"), h("span", { class: "chip" }, "Seu 2027")),
    h("span", { class: "botao botao-principal" }, "Começar a descoberta", svg(ICONES.seta)),
    h("span", { class: "mini" }, "2 minutos · 5 escolhas rápidas"),
  );
  cartaNome.addEventListener("click", async (e) => {
    e.preventDefault();
    evento("escolha_nome");
    if (!movimentoReduzido()) {
      cartaNome.classList.add("tocada");
      await esperar(220);
    }
    ir("/quiz");
  });
  trocar(
    tela,
    h("h1", { class: "escolha-titulo" }, `${nome}, escolha a sua descoberta`),
    cartaNome,
    h(
      "div",
      { class: "carta-jogo carta-trancada", role: "group", "aria-label": "Compatibilidade do casal, em breve" },
      h("div", { class: "card-cabeca" }, h("h2", {}, "Compatibilidade do casal"), h("span", { class: "selo selo-breve" }, "Em breve")),
      h("div", { class: "carta-arte" }, svg(ARTE_CASAL)),
      h("p", { class: "apoio pequeno" }, "Ainda não está disponível. Os dois nomes lado a lado: onde vocês se encontram e onde se desafiam."),
      h("div", {}, botaoCasal),
      avisoCasal,
    ),
    h("button", { class: "botao-texto", type: "button", onclick: () => telaInicio(tela, { ir }) }, "Voltar"),
  );
  window.scrollTo(0, 0);
}
