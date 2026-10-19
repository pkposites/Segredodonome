// Quiz como jogo de descoberta (/quiz → /quiz/parte-2). Uma escolha por tela, avanço automático.
// As perguntas, a ordem das opções e as entradas enviadas ao Worker são as mesmas de antes.
// Estado só no sessionStorage deste navegador até o envio.
import { h, svg, trocar, ICONES, primeiroNomeDe, movimentoReduzido, esperar } from "../dom.js";
import { local, sessao } from "../armazenamento.js";
import { PERGUNTAS, textoOpcao } from "../perguntas.js";
import { MICRO_REVELACOES } from "../micro-revelacoes.js";
import { CONFIG } from "../config.js";
import { evento } from "../rastreio.js";
import { mostrarPista, esconderPista } from "../pistas.js";
import { definirLetras } from "../fundo.js";
import { telaProcessando } from "./processando.js";

const TOTAL = 9; // nome, data, tratamento, 5 escolhas, consentimento
const PASSO_PRIMEIRA_PERGUNTA = 3;
const PASSO_METADE = PASSO_PRIMEIRA_PERGUNTA + 2; // depois da 2ª escolha de comportamento
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const ICONES_EIXO = [ICONES.raio, ICONES.alvo, ICONES.lua, ICONES.lupa]; // ação+emoção, ação+razão, reflexão+emoção, reflexão+razão

/** Rótulo de jornada de cada etapa (substitui "Pergunta N de 9"). */
const ROTULOS = [
  "Sua primeira pista",
  "Mais uma peça",
  "Do seu jeito",
  "Primeira escolha",
  "Mais uma peça encontrada",
  "Seu perfil está tomando forma",
  "Quase lá",
  "Última pista antes da revelação",
  "Tudo pronto para a revelação",
];

function estado() {
  return sessao.ler("quiz") ?? { passo: 0, nome: sessao.ler("primeiro_nome") ?? "", dia: "", mes: "", ano: "", tratamento: null, respostas: [] };
}
const salvar = (e) => sessao.gravar("quiz", e);

function idade(iso) {
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const [an, mn, dn] = iso.split("-").map(Number);
  const [ah, mh, dh] = hoje.split("-").map(Number);
  return ah - an - (mh < mn || (mh === mn && dh < dn) ? 1 : 0);
}

function dataIso(e) {
  const d = Number(e.dia), m = Number(e.mes), a = Number(e.ano);
  if (!d || !m || !a || a < 1900) return null;
  const dt = new Date(Date.UTC(a, m - 1, d));
  if (dt.getUTCDate() !== d || dt.getUTCMonth() !== m - 1) return null;
  return `${a}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Variáveis das micro-revelações calculadas no aparelho (nada vai ao servidor aqui). */
function variaveis(e) {
  const letras = e.nome.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z]/g, "");
  const cont = new Map();
  for (const l of letras) cont.set(l, (cont.get(l) ?? 0) + 1);
  let mais = { l: letras[0] ?? "", n: 0 };
  for (const [l, n] of cont) if (n > mais.n) mais = { l, n };
  return {
    primeiro_nome: primeiroNomeDe(e.nome),
    inicial: (letras[0] ?? "").toUpperCase(),
    qtd_letras: String(letras.length),
    letra_mais_repetida: mais.l.toUpperCase(),
    qtd_letra_mais_repetida: String(mais.n),
    comeca_com_vogal: "aeiou".includes(letras[0]) ? "uma vogal" : "uma consoante",
    mes_aniversario: MESES[Number(e.mes) - 1] ?? "",
    repete: mais.n >= 2,
  };
}

function microRevelacao(e, indice) {
  const v = variaveis(e);
  const opcoes = MICRO_REVELACOES.filter((t) => v.repete || !/\{(letra_mais_repetida|qtd_letra_mais_repetida)\}/.test(t)).filter(
    (t) => !t.includes("{mes_aniversario}") || v.mes_aniversario,
  );
  // Escolha fixa por nome (sem sorteio): soma dos códigos das letras.
  const base = [...v.primeiro_nome].reduce((s, c) => s + c.charCodeAt(0), 0);
  const t = opcoes[(base + indice) % opcoes.length] ?? "";
  return { texto: t.replace(/\{([a-z_]+)\}/g, (m, k) => v[k] ?? m), inicial: v.inicial };
}

/** Mensagem depois de concluir cada etapa: progresso real ou detalhe do próprio nome/data. */
function pistaDepoisDe(passo, e) {
  const v = variaveis(e);
  if (passo === 0) return mostrarPista(`A letra ${v.inicial} abre o seu nome. Guarde essa pista.`, { icone: v.inicial });
  if (passo === 1 && v.mes_aniversario) return mostrarPista(`Pista guardada: você nasceu em ${v.mes_aniversario}.`);
  if (passo === 3) return mostrarPista("Mais uma peça da sua descoberta foi encontrada.");
  if (passo === 4 || passo === 6) {
    const m = microRevelacao(e, passo);
    return mostrarPista(m.texto, { icone: m.inicial, longa: true });
  }
  if (passo === 5) return mostrarPista("Suas escolhas estão formando um padrão.");
  if (passo === 7) return mostrarPista("Você está chegando perto da sua carta.");
}

export function telaQuiz(tela, { ir, parte2 }) {
  const e = estado();
  // Voltar/avançar do navegador entre /quiz e /quiz/parte-2
  if (parte2 && e.passo < PASSO_METADE) e.passo = PASSO_METADE;
  if (!parte2 && e.passo >= PASSO_METADE) e.passo = PASSO_METADE - 1;
  salvar(e);
  if (e.nome) definirLetras(e.nome);
  desenhar(tela, e, ir, false);
}

function desenhar(tela, e, ir, voltando) {
  const concluir = async (passo) => {
    evento(`quiz_passo_${passo + 1}`);
    pistaDepoisDe(passo, e);
    irPara(passo + 1);
  };
  const irPara = (passo, volta = false) => {
    e.passo = passo;
    salvar(e);
    if (passo === PASSO_METADE && location.pathname !== "/quiz/parte-2") return ir("/quiz/parte-2");
    if (passo < PASSO_METADE && location.pathname === "/quiz/parte-2") return ir("/quiz");
    desenhar(tela, e, ir, volta);
    window.scrollTo(0, 0);
  };
  const voltar = () => {
    esconderPista();
    return e.passo === 0 ? ir("/") : irPara(e.passo - 1, true);
  };

  const p = e.passo;
  const topo = h(
    "div",
    { class: "quiz-topo" },
    h("button", { class: "icone-botao", type: "button", "aria-label": "Voltar", onclick: voltar }, svg(ICONES.voltar)),
    h("span", { class: "sr-only", "aria-live": "polite" }, `Etapa ${p + 1} de ${TOTAL}`),
    h("button", { class: "icone-botao", type: "button", "aria-label": "Sair do quiz", onclick: () => (esconderPista(), ir("/")) }, svg(ICONES.fechar)),
  );
  const jornada = h(
    "div",
    { class: "jornada", "aria-hidden": "true" },
    Array.from({ length: TOTAL }, (_, i) => [
      i > 0 ? h("i", { class: i <= p ? "feito" : "" }) : null,
      h("b", { class: i < p ? "feito" : i === p ? "atual" : "" }),
    ]).flat(),
  );
  const corpo = h("div", { class: `etapa${voltando ? " volta" : ""}` }, h("span", { class: "pista-rotulo" }, svg(ICONES.brilho), ROTULOS[p]));
  trocar(tela, topo, jornada, corpo);

  const erro = h("p", { class: "erro", role: "alert" });
  const add = (...els) => corpo.append(...els.flat().filter(Boolean));

  if (p === 0) {
    const campo = h("input", { id: "nome", class: "campo", value: e.nome, autocomplete: "name", autocapitalize: "words", maxlength: "80", enterkeyhint: "next" });
    campo.addEventListener("input", () => definirLetras(campo.value));
    const enviar = (ev) => {
      ev.preventDefault();
      const letras = campo.value.normalize("NFD").replace(/[^a-zA-Z]/g, "");
      if (campo.value.trim().length < 2 || letras.length < 2) return void (erro.textContent = "Confira o seu nome: precisamos de pelo menos 2 letras.");
      e.nome = campo.value.trim().replace(/\s+/g, " ");
      concluir(0);
    };
    add(
      h(
        "form",
        { class: "pilha", onsubmit: enviar, novalidate: true },
        h("label", { for: "nome", class: "pergunta-titulo" }, "Como você se chama no dia a dia?"),
        h("p", { class: "apoio pequeno" }, "Complete com o sobrenome que você usa: ele muda a sua carta. Pode ser o seu nome social."),
        campo,
        erro,
        h("button", { class: "botao botao-principal", type: "submit" }, "Guardar esta pista", svg(ICONES.seta)),
      ),
    );
    // Cursor no fim do primeiro nome já preenchido, para só completar o sobrenome.
    campo.focus();
    campo.setSelectionRange(campo.value.length, campo.value.length);
  } else if (p === 1) {
    const dia = h("input", { class: "campo", inputmode: "numeric", maxlength: "2", placeholder: "Dia", "aria-label": "Dia", value: e.dia, autocomplete: "bday-day" });
    const mes = h("select", { class: "campo", "aria-label": "Mês", autocomplete: "bday-month" }, h("option", { value: "" }, "Mês"), MESES.map((m, i) => h("option", { value: String(i + 1), selected: String(i + 1) === String(e.mes) }, m)));
    const ano = h("input", { class: "campo", inputmode: "numeric", maxlength: "4", placeholder: "Ano", "aria-label": "Ano", value: e.ano, autocomplete: "bday-year" });
    dia.addEventListener("input", () => dia.value.length === 2 && mes.focus());
    const enviar = (ev) => {
      ev.preventDefault();
      Object.assign(e, { dia: dia.value.trim(), mes: mes.value, ano: ano.value.trim() });
      const iso = dataIso(e);
      if (!iso || idade(iso) > 110) return void (erro.textContent = "Confira a data: dia, mês e ano com 4 números.");
      if (idade(iso) < 18) {
        // Nada é enviado nem guardado (legal/TEXTOS_DE_CONSENTIMENTO.md, 9).
        sessao.gravar("quiz", null);
        return trocar(corpo, h("h1", { class: "pergunta-titulo" }, "Este quiz é para maiores de 18 anos."), h("p", { class: "apoio" }, "Obrigado pelo interesse!"), h("a", { class: "botao botao-contorno", href: "/", "data-link": true }, "Voltar ao início"));
      }
      concluir(1);
    };
    add(
      h(
        "form",
        { class: "pilha", onsubmit: enviar, novalidate: true },
        h("h1", { class: "pergunta-titulo" }, "Quando você nasceu?"),
        h("p", { class: "apoio pequeno" }, "A data muda duas partes da sua carta. Ela fica só neste aparelho."),
        h("div", { class: "data-campos" }, dia, mes, ano),
        erro,
        h("button", { class: "botao botao-principal", type: "submit" }, "Guardar esta pista", svg(ICONES.seta)),
      ),
    );
    if (!e.dia) dia.focus();
  } else if (p === 2) {
    const opcoes = [["ela", "Ela"], ["ele", "Ele"], ["neutro", "Prefiro linguagem neutra"]];
    const botoes = opcoes.map(([v, rotulo]) =>
      h("button", { class: "opcao", type: "button", "aria-pressed": String(e.tratamento === v), onclick: () => escolher(v, botoes, () => (e.tratamento = v), 2) }, rotulo),
    );
    add(
      h("h1", { class: "pergunta-titulo" }, "Como prefere que a gente fale com você?"),
      h("p", { class: "apoio pequeno" }, "Só muda o jeito de escrever a sua carta."),
      h("div", { class: "opcoes opcoes-curtas" }, botoes),
    );
  } else if (p >= PASSO_PRIMEIRA_PERGUNTA && p < PASSO_PRIMEIRA_PERGUNTA + PERGUNTAS.length) {
    const q = p - PASSO_PRIMEIRA_PERGUNTA;
    const pergunta = PERGUNTAS[q];
    const botoes = pergunta.opcoes.map((o, i) =>
      h(
        "button",
        { class: "opcao", type: "button", "aria-pressed": String(e.respostas[q] === i), onclick: () => escolher(i, botoes, () => (e.respostas[q] = i), p) },
        h("span", { class: "opcao-icone", "aria-hidden": "true" }, svg(ICONES_EIXO[i])),
        h("span", {}, textoOpcao(o, e.tratamento ?? "neutro")),
      ),
    );
    add(h("h1", { class: "pergunta-titulo" }, pergunta.titulo), h("div", { class: "opcoes", role: "group", "aria-label": pergunta.titulo }, botoes));
  } else {
    const caixa = h("input", { type: "checkbox", id: "aceite" });
    const revelar = h("button", { class: "botao botao-principal", type: "button", disabled: true }, "Revelar minha carta", svg(ICONES.brilho));
    caixa.addEventListener("change", () => (revelar.disabled = !caixa.checked));
    revelar.addEventListener("click", () => {
      if (!caixa.checked) return;
      local.gravar("aceite_termos", { versao: CONFIG.VERSAO_TERMOS, em: new Date().toISOString() });
      evento("quiz_passo_9");
      const entradas = { nome: e.nome, data_nascimento: dataIso(e), tratamento: e.tratamento ?? "neutro", respostas: e.respostas.slice(0, 5) };
      telaProcessando(tela, { ir, entradas, aoFalhar: () => desenhar(tela, e, ir, true) });
    });
    // Texto de legal/TEXTOS_DE_CONSENTIMENTO.md, 2 (sem alterar).
    add(
      h("h1", { class: "pergunta-titulo" }, "Sua carta está pronta para ser revelada"),
      h(
        "label",
        { class: "consentimento", for: "aceite" },
        caixa,
        h(
          "span",
          { class: "texto-consentimento" },
          "Ao continuar, você confirma que tem 18 anos ou mais e concorda com os ",
          h("a", { href: "/termos", target: "_blank" }, "Termos de Uso"),
          " e a ",
          h("a", { href: "/privacidade", target: "_blank" }, "Política de Privacidade"),
          ". Usamos seu nome e sua data de nascimento só para montar o resultado e não guardamos esses dados depois. Este é um conteúdo de entretenimento. ",
          h("strong", {}, "Li e concordo"),
          " (obrigatório)",
        ),
      ),
      revelar,
    );
  }

  /** Seleção com retorno visual imediato e avanço automático curto. */
  async function escolher(valor, botoes, aplicar, passo) {
    aplicar();
    salvar(e);
    botoes.forEach((b, j) => {
      const sel = j === (typeof valor === "number" ? valor : ["ela", "ele", "neutro"].indexOf(valor));
      b.setAttribute("aria-pressed", String(sel));
      b.classList.toggle("escolhida-agora", sel);
      b.disabled = true;
    });
    await esperar(movimentoReduzido() ? 120 : 380);
    concluir(passo);
  }
}
