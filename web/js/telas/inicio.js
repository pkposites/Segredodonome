// Landing (/) e escolha da trilha (web/TELAS.md, 1 e 2).
import { h, svg, trocar, movimentoReduzido, primeiroNomeDe, ICONES } from "../dom.js";
import { emblema } from "../emblemas.js";
import { local, sessao } from "../armazenamento.js";
import { evento } from "../rastreio.js";

const EXEMPLOS = ["Ana", "Léo", "Bruna", "Carlos"];

function letrasDe(texto) {
  return [...String(texto).replace(/[^\p{L}]/gu, "").toLocaleUpperCase("pt-BR")].slice(0, 14);
}

function blocos(alvo, texto, animar) {
  trocar(alvo, letrasDe(texto).map((l, i) => {
    const el = h("span", { class: animar ? "letra entra" : "letra" }, l);
    if (animar) setTimeout(() => el.classList.remove("entra"), 40 + i * 60);
    return el;
  }));
}

export function telaInicio(tela, { ir }) {
  const salvo = local.ler("passe") || local.ler("entradas");
  const nomeSalvo = local.ler("primeiro_nome");
  const letras = h("div", { class: "letras", "aria-hidden": "true" });
  const seloExemplo = h("span", { class: "selo selo-exemplo" }, "Exemplo");
  const campo = h("input", {
    id: "primeiro-nome", class: "campo", name: "primeiro-nome", placeholder: "Ex.: Bruna",
    autocomplete: "given-name", autocapitalize: "words", maxlength: "40", enterkeyhint: "next",
    value: sessao.ler("primeiro_nome") ?? "",
  });
  const erro = h("p", { class: "erro", role: "alert" });

  // Animação de exemplo (≤ 6 s em loop, sem som, pausável; para quando a pessoa digita).
  let i = 0;
  let pausado = movimentoReduzido();
  let timer = null;
  const botaoPausa = h("button", { class: "icone-botao", type: "button", "aria-label": "Pausar animação" }, svg(ICONES.pausa));
  function tick() {
    blocos(letras, EXEMPLOS[i % EXEMPLOS.length], !movimentoReduzido());
    i++;
  }
  function iniciar() {
    clearInterval(timer);
    if (!pausado) timer = setInterval(tick, 1500); // 4 nomes × 1,5 s = 6 s por volta
  }
  botaoPausa.addEventListener("click", () => {
    pausado = !pausado;
    botaoPausa.replaceChildren(svg(pausado ? ICONES.play : ICONES.pausa));
    botaoPausa.setAttribute("aria-label", pausado ? "Retomar animação" : "Pausar animação");
    iniciar();
  });
  tick();
  iniciar();

  campo.addEventListener("input", () => {
    erro.textContent = "";
    const v = campo.value.trim();
    if (v) {
      clearInterval(timer);
      seloExemplo.hidden = true;
      botaoPausa.hidden = true;
      blocos(letras, v, false);
    } else {
      seloExemplo.hidden = false;
      botaoPausa.hidden = false;
      iniciar();
    }
  });

  function continuar(e) {
    e.preventDefault();
    const nome = primeiroNomeDe(campo.value);
    if (letrasDe(nome).length < 2) {
      erro.textContent = "Digite o seu primeiro nome para continuar.";
      campo.focus();
      return;
    }
    clearInterval(timer);
    sessao.gravar("primeiro_nome", nome);
    telaEscolha(tela, { ir, nome });
  }

  const form = h(
    "form",
    { class: "pilha", onsubmit: continuar, novalidate: true },
    h("label", { class: "campo-rotulo", for: "primeiro-nome" }, "Qual é o seu primeiro nome?"),
    campo,
    erro,
    h("button", { class: "botao botao-claro", type: "submit" }, "Continuar", svg(ICONES.seta)),
  );

  trocar(
    tela,
    salvo && nomeSalvo
      ? h("a", { class: "faixa-salvo", href: "/r", "data-link": true }, h("span", {}, `${nomeSalvo}, seu resultado está salvo`), h("strong", {}, "abrir →"))
      : null,
    h(
      "div",
      { class: "card" },
      h("div", { class: "card-cabeca" }, h("span", { class: "rotulo" }, "Prévia de resultado"), h("div", { class: "linha" }, botaoPausa, seloExemplo)),
      h(
        "div",
        { class: "linha" },
        h("div", { class: "emblema-caixa" }, svg(emblema(7, 56))),
        h("div", { class: "pilha-8" }, letras, h("span", { class: "arq-mini" }, "O Farol"), h("span", { class: "mini" }, "Jeito magnético · 1 de 9 arquétipos")),
      ),
      h("hr", { class: "divisor" }),
      h("span", { class: "pequeno texto-2" }, "“Você percebe o que está por trás das palavras e só fala quando tem certeza.”"),
    ),
    h("div", { class: "pilha-8" }, h("h1", { class: "titulo-grande" }, "Seu nome guarda um segredo"), h("p", { class: "apoio" }, "Responda, descubra e revele em 2 minutos.")),
    form,
    h(
      "section",
      { id: "como", class: "pilha", "aria-labelledby": "como-titulo" },
      h("h2", { class: "secao", id: "como-titulo" }, "Como funciona"),
      h(
        "div",
        { class: "passos" },
        h("div", { class: "passo" }, h("b", {}, "1"), "Digite o nome e a data"),
        h("div", { class: "passo" }, h("b", {}, "2"), "Responda 5 perguntas"),
        h("div", { class: "passo" }, h("b", {}, "3"), "Veja o seu arquétipo grátis"),
      ),
      h("p", { class: "pequeno apoio" }, "É uma interpretação lúdica feita a partir das letras do seu nome, da sua data de nascimento e das suas respostas. É entretenimento: não é avaliação psicológica nem previsão."),
    ),
    h(
      "section",
      { class: "pilha-8", "aria-labelledby": "faq-titulo" },
      h("h2", { class: "secao", id: "faq-titulo" }, "Perguntas frequentes"),
      faq("É pago?", "O resultado com o seu arquétipo é grátis e completo. Se quiser, você pode liberar o resultado expandido, com mais seções e PDF, por R$ 11,90 no Pix, pagamento único."),
      faq("Quanto tempo leva?", "Cerca de 2 minutos: nome, data de nascimento e 5 perguntas rápidas."),
      faq("Meus dados ficam salvos?", "Não nos nossos servidores. O seu nome, a sua data e as suas respostas ficam só neste aparelho e no seu link de acesso, que é criptografado. Você pode apagar tudo a qualquer momento."),
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
  trocar(
    tela,
    h("h1", { class: "titulo" }, `${nome}, o que você quer descobrir?`),
    h(
      "a",
      { class: "trilha trilha-nome", href: "/quiz", "data-link": true },
      h("span", { class: "cor-nome" }, svg(emblema(7, 40, 4))),
      h("h2", {}, "Segredo do nome"),
      h("p", { class: "apoio pequeno" }, "O que as letras do seu nome revelam sobre o seu jeito, o amor, o dinheiro e o seu próximo ano."),
      h("div", { class: "chips" }, h("span", { class: "chip" }, "Seu arquétipo"), h("span", { class: "chip" }, "Amor e dinheiro"), h("span", { class: "chip" }, "Seu 2027")),
      h("div", { class: "trilha-rodape" }, h("span", {}, "2 min · grátis pra começar"), h("strong", {}, "Começar →")),
    ),
    h(
      "div",
      { class: "trilha trilha-casal", "aria-label": "Compatibilidade do casal, em breve" },
      h("div", { class: "card-cabeca" }, h("h2", {}, "Compatibilidade do casal"), h("span", { class: "selo selo-breve" }, "Em breve")),
      h("p", { class: "apoio pequeno" }, "Os dois nomes lado a lado: onde vocês se encontram e onde se desafiam."),
      h("div", { class: "chips" }, h("span", { class: "chip" }, "Índice de sintonia"), h("span", { class: "chip" }, "Pontos fortes"), h("span", { class: "chip" }, "Próximos 12 meses")),
      h("div", {}, botaoCasal),
      avisoCasal,
    ),
    h("button", { class: "botao-texto", type: "button", onclick: () => telaInicio(tela, { ir }) }, "Voltar"),
  );
  window.scrollTo(0, 0);
}
