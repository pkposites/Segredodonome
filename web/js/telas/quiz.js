// Quiz (/quiz → /quiz/parte-2), uma pergunta por tela (web/TELAS.md, 3).
// Estado só no sessionStorage deste navegador até o envio.
import { h, svg, trocar, ICONES, primeiroNomeDe } from "../dom.js";
import { local, sessao } from "../armazenamento.js";
import { PERGUNTAS, textoOpcao } from "../perguntas.js";
import { MICRO_REVELACOES } from "../micro-revelacoes.js";
import { CONFIG } from "../config.js";
import { telaProcessando } from "./processando.js";

const TOTAL = 9; // nome, data, tratamento, 5 perguntas, consentimento
const PASSO_PRIMEIRA_PERGUNTA = 3;
const PASSO_METADE = PASSO_PRIMEIRA_PERGUNTA + 2; // depois da 2ª pergunta de comportamento
const PASSOS_COM_MICRO = [4, 6]; // 5ª e 7ª telas
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

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

export function telaQuiz(tela, { ir, parte2 }) {
  const e = estado();
  // Voltar/avançar do navegador entre /quiz e /quiz/parte-2
  if (parte2 && e.passo < PASSO_METADE) e.passo = PASSO_METADE;
  if (!parte2 && e.passo >= PASSO_METADE) e.passo = PASSO_METADE - 1;
  salvar(e);
  desenhar(tela, e, ir);
}

function desenhar(tela, e, ir) {
  const ir_para = (passo) => {
    e.passo = passo;
    salvar(e);
    if (passo === PASSO_METADE && location.pathname !== "/quiz/parte-2") return ir("/quiz/parte-2");
    if (passo < PASSO_METADE && location.pathname === "/quiz/parte-2") return ir("/quiz");
    desenhar(tela, e, ir);
    window.scrollTo(0, 0);
  };
  const voltar = () => (e.passo === 0 ? ir("/") : ir_para(e.passo - 1));

  const topo = h(
    "div",
    { class: "quiz-topo" },
    h("button", { class: "icone-botao", type: "button", "aria-label": "Voltar", onclick: voltar }, svg(ICONES.voltar)),
    h("span", { "aria-live": "polite" }, `Pergunta ${e.passo + 1} de ${TOTAL}`),
    h("button", { class: "icone-botao", type: "button", "aria-label": "Sair do quiz", onclick: () => ir("/") }, svg(ICONES.fechar)),
  );
  const barra = h("div", { class: "progresso", "aria-hidden": "true" }, Array.from({ length: TOTAL }, (_, i) => h("span", { class: i <= e.passo ? "feito" : "" })));
  const corpo = h("div", { class: "pilha" });
  trocar(tela, topo, barra, corpo);

  const erro = h("p", { class: "erro", role: "alert" });
  const p = e.passo;

  if (p === 0) {
    const campo = h("input", { id: "nome", class: "campo", value: e.nome, autocomplete: "name", autocapitalize: "words", maxlength: "80", enterkeyhint: "next" });
    const enviar = (ev) => {
      ev.preventDefault();
      const letras = campo.value.normalize("NFD").replace(/[^a-zA-Z]/g, "");
      if (campo.value.trim().length < 2 || letras.length < 2) return void (erro.textContent = "Confira o seu nome: precisamos de pelo menos 2 letras.");
      e.nome = campo.value.trim().replace(/\s+/g, " ");
      ir_para(1);
    };
    trocar(
      corpo,
      h(
        "form",
        { class: "pilha", onsubmit: enviar, novalidate: true },
        h("label", { for: "nome", class: "pergunta-titulo" }, "Como você se chama no dia a dia?"),
        h("p", { class: "apoio pequeno" }, "Use o nome do dia a dia, com sobrenome. O sobrenome muda o resultado. Pode ser o seu nome social."),
        campo,
        erro,
        h("button", { class: "botao botao-principal", type: "submit" }, "Continuar"),
      ),
    );
    campo.focus();
  } else if (p === 1) {
    const dia = h("input", { class: "campo", inputmode: "numeric", maxlength: "2", placeholder: "Dia", "aria-label": "Dia", value: e.dia, autocomplete: "bday-day" });
    const mes = h("select", { class: "campo", "aria-label": "Mês", autocomplete: "bday-month" }, h("option", { value: "" }, "Mês"), MESES.map((m, i) => h("option", { value: String(i + 1), selected: String(i + 1) === String(e.mes) }, m)));
    const ano = h("input", { class: "campo", inputmode: "numeric", maxlength: "4", placeholder: "Ano", "aria-label": "Ano", value: e.ano, autocomplete: "bday-year" });
    const enviar = (ev) => {
      ev.preventDefault();
      Object.assign(e, { dia: dia.value.trim(), mes: mes.value, ano: ano.value.trim() });
      const iso = dataIso(e);
      if (!iso || idade(iso) > 110) return void (erro.textContent = "Confira a data de nascimento.");
      if (idade(iso) < 18) {
        // Nada é enviado nem guardado (legal/TEXTOS_DE_CONSENTIMENTO.md, 9).
        sessao.gravar("quiz", null);
        return trocar(corpo, h("h1", { class: "pergunta-titulo" }, "Este quiz é para maiores de 18 anos."), h("p", { class: "apoio" }, "Obrigado pelo interesse!"), h("a", { class: "botao botao-contorno", href: "/", "data-link": true }, "Voltar ao início"));
      }
      ir_para(2);
    };
    trocar(
      corpo,
      h(
        "form",
        { class: "pilha", onsubmit: enviar, novalidate: true },
        h("h1", { class: "pergunta-titulo" }, "Quando você nasceu?"),
        h("p", { class: "apoio pequeno" }, "A data muda duas partes do resultado. Ela fica só neste aparelho."),
        h("div", { class: "data-campos" }, dia, mes, ano),
        erro,
        h("button", { class: "botao botao-principal", type: "submit" }, "Continuar"),
      ),
    );
    dia.focus();
  } else if (p === 2) {
    const opcoes = [["ela", "Ela"], ["ele", "Ele"], ["neutro", "Prefiro linguagem neutra"]];
    trocar(
      corpo,
      h("h1", { class: "pergunta-titulo" }, "Como prefere que a gente fale com você?"),
      h("p", { class: "apoio pequeno" }, "Só muda o jeito de escrever. Se preferir, deixe no neutro."),
      h("div", { class: "opcoes" }, opcoes.map(([v, rotulo]) =>
        h("button", { class: "opcao", type: "button", "aria-pressed": String(e.tratamento === v), onclick: () => { e.tratamento = v; ir_para(3); } }, rotulo),
      )),
    );
  } else if (p >= PASSO_PRIMEIRA_PERGUNTA && p < PASSO_PRIMEIRA_PERGUNTA + PERGUNTAS.length) {
    const q = p - PASSO_PRIMEIRA_PERGUNTA;
    const pergunta = PERGUNTAS[q];
    const balao = h("div", { "aria-live": "polite" });
    const continuar = h("button", { class: "botao botao-principal", type: "button", hidden: true, onclick: () => ir_para(p + 1) }, "Continuar");
    const botoes = pergunta.opcoes.map((o, i) =>
      h(
        "button",
        {
          class: "opcao",
          type: "button",
          "aria-pressed": String(e.respostas[q] === i),
          onclick: () => {
            e.respostas[q] = i;
            salvar(e);
            botoes.forEach((b, j) => b.setAttribute("aria-pressed", String(i === j)));
            if (PASSOS_COM_MICRO.includes(p)) {
              const m = microRevelacao(e, p);
              trocar(balao, h("div", { class: "balao" }, h("span", { class: "letra" }, m.inicial), h("span", {}, m.texto)));
              continuar.hidden = false;
              continuar.focus();
            } else {
              ir_para(p + 1);
            }
          },
        },
        textoOpcao(o, e.tratamento ?? "neutro"),
      ),
    );
    trocar(corpo, h("h1", { class: "pergunta-titulo" }, pergunta.titulo), h("div", { class: "opcoes" }, botoes), balao, continuar);
  } else {
    const caixa = h("input", { type: "checkbox", id: "aceite" });
    const revelar = h("button", { class: "botao botao-principal", type: "button", disabled: true }, "Revelar meu resultado");
    caixa.addEventListener("change", () => (revelar.disabled = !caixa.checked));
    revelar.addEventListener("click", () => {
      if (!caixa.checked) return;
      local.gravar("aceite_termos", { versao: CONFIG.VERSAO_TERMOS, em: new Date().toISOString() });
      const entradas = { nome: e.nome, data_nascimento: dataIso(e), tratamento: e.tratamento ?? "neutro", respostas: e.respostas.slice(0, 5) };
      telaProcessando(tela, { ir, entradas, aoFalhar: () => desenhar(tela, e, ir) });
    });
    trocar(
      corpo,
      h("h1", { class: "pergunta-titulo" }, "Antes de revelar"),
      h(
        "p",
        { class: "apoio" },
        "Ao continuar, você confirma que tem 18 anos ou mais e concorda com os ",
        h("a", { href: "/termos", target: "_blank" }, "Termos de Uso"),
        " e a ",
        h("a", { href: "/privacidade", target: "_blank" }, "Política de Privacidade"),
        ". Usamos seu nome e sua data de nascimento só para montar o resultado e não guardamos esses dados depois. Este é um conteúdo de entretenimento.",
      ),
      h("label", { class: "consentimento", for: "aceite" }, caixa, h("span", {}, h("strong", {}, "Li e concordo"), " (obrigatório)")),
      revelar,
    );
  }
}
