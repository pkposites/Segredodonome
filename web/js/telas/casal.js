// Bônus "Compatibilidade do casal" (decisão de 25/10/2026 em docs/DECISOES.md).
// Só aparece depois do pagamento. O nome e a data da outra pessoa vão ao Worker junto com o passe,
// voltam como texto e ficam só neste aparelho: o servidor não guarda nada e nada vai para Pixel ou Clarity.
import { h, svg, ICONES } from "../dom.js";
import { local } from "../armazenamento.js";
import { post } from "../api.js";
import { emblema } from "../emblemas.js";
import { mostrarPista } from "../pistas.js";

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function dataIso(dia, mes, ano) {
  const d = Number(dia), m = Number(mes), a = Number(ano);
  if (!d || !m || !a || a < 1900) return null;
  const dt = new Date(Date.UTC(a, m - 1, d));
  if (dt.getUTCDate() !== d || dt.getUTCMonth() !== m - 1) return null;
  return `${a}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Vitrine do bônus na oferta (antes do pagamento): só a promessa, nenhum texto do bônus. */
export function vitrineBonusCasal(gratis) {
  return h(
    "div",
    { class: "bonus-vitrine" },
    h("span", { class: "bonus-selo" }, svg(ICONES.brilho), "Bônus incluso"),
    h(
      "div",
      { class: "bonus-par", "aria-hidden": "true" },
      h("span", { class: "bonus-carta" }, svg(emblema(gratis.arquetipo.numero, 34, 2)), h("span", {}, gratis.arquetipo.nome)),
      h("span", { class: "bonus-mais" }, "+"),
      h("span", { class: "bonus-carta bonus-carta-oculta" }, h("span", { class: "bonus-interrogacao" }, "?"), h("span", {}, "a carta de quem você ama")),
    ),
    h("strong", { class: "bonus-titulo" }, "Compatibilidade do casal"),
    h(
      "p",
      { class: "pequeno texto-2" },
      "Depois do pagamento, você digita o nome e a data de nascimento de quem você ama e descobre a combinação das duas cartas: a sintonia de vocês, o que cada pessoa traz para a relação e uma frase para o casal.",
    ),
  );
}

function resultadoCasal(c, { refazer }) {
  const compartilhar = h("button", { class: "botao botao-contorno", type: "button" }, svg(ICONES.compartilhar), "Compartilhar a combinação");
  compartilhar.addEventListener("click", async () => {
    // Só as cartas e o endereço do site: nenhum nome no texto nem no link.
    const texto = `No Segredo do Nome, a nossa combinação é ${c.combinacao}: ${c.sintonia.titulo}. Descubra a sua:`;
    try {
      if (navigator.share) return await navigator.share({ title: "Segredo do Nome", text: texto, url: location.origin });
      await navigator.clipboard.writeText(`${texto} ${location.origin}`);
      mostrarPista("Texto copiado. É só colar onde quiser.");
    } catch {
      // compartilhamento cancelado
    }
  });
  const salvar = h(
    "button",
    {
      class: "botao botao-principal",
      type: "button",
      onclick: () => {
        document.body.classList.add("imprimindo-casal");
        window.print();
        document.body.classList.remove("imprimindo-casal");
      },
    },
    svg(ICONES.baixar),
    "Salvar em PDF",
  );
  const pessoa = (p) =>
    h(
      "div",
      { class: "casal-pessoa" },
      h("span", { class: "casal-emblema" }, svg(emblema(p.carta.numero, 40, 2))),
      h("div", { class: "pilha-8" }, h("strong", {}, `${p.primeiro_nome} · ${p.carta.nome}`), h("p", { class: "pequeno" }, p.traz), h("p", { class: "pequeno texto-2" }, p.pede)),
    );
  return h(
    "div",
    { class: "pilha casal-resultado" },
    h("span", { class: "rotulo" }, "A combinação de vocês"),
    h("h3", { class: "casal-combinacao serifa" }, c.combinacao),
    h("div", { class: "casal-sintonia" }, h("strong", {}, c.sintonia.titulo), h("p", {}, c.sintonia.texto)),
    pessoa(c.voce),
    pessoa(c.parceria),
    h("blockquote", { class: "casal-frase" }, `“${c.frase}”`),
    h("div", { class: "pilha-8 nao-imprimir" }, salvar, compartilhar, h("button", { class: "botao-texto", type: "button", onclick: refazer }, "Fazer com outra pessoa")),
    h("p", { class: "mini" }, "Conteúdo de entretenimento, sem valor científico ou de previsão."),
  );
}

function formulario({ passe, aoTerminar }) {
  const erro = h("p", { class: "erro", role: "alert" });
  const nome = h("input", { class: "campo", type: "text", maxlength: "80", autocomplete: "off", placeholder: "Nome completo", "aria-label": "Nome completo da outra pessoa" });
  const dia = h("input", { class: "campo", inputmode: "numeric", maxlength: "2", placeholder: "Dia", "aria-label": "Dia", autocomplete: "off" });
  const mes = h("select", { class: "campo", "aria-label": "Mês" }, h("option", { value: "" }, "Mês"), MESES.map((m, i) => h("option", { value: String(i + 1) }, m)));
  const ano = h("input", { class: "campo", inputmode: "numeric", maxlength: "4", placeholder: "Ano", "aria-label": "Ano", autocomplete: "off" });
  dia.addEventListener("input", () => dia.value.length === 2 && mes.focus());
  const enviar = h("button", { class: "botao botao-principal", type: "submit" }, "Ver a combinação", svg(ICONES.seta));

  const aoEnviar = async (ev) => {
    ev.preventDefault();
    erro.textContent = "";
    if (nome.value.trim().length < 2) return void (erro.textContent = "Digite o nome da outra pessoa.");
    const data = dataIso(dia.value.trim(), mes.value, ano.value.trim());
    if (!data) return void (erro.textContent = "Confira a data: dia, mês e ano com 4 números.");
    enviar.disabled = true;
    enviar.replaceChildren(h("span", { class: "girador", "aria-hidden": "true" }), "Combinando as cartas…");
    try {
      const r = await post("/bonus/casal", { passe, parceria: { nome: nome.value.trim(), data_nascimento: data } });
      aoTerminar(r.casal);
    } catch (e) {
      erro.textContent = e.message;
      enviar.disabled = false;
      enviar.replaceChildren("Ver a combinação", svg(ICONES.seta));
    }
  };

  const form = h(
    "form",
    { class: "pilha", onsubmit: aoEnviar, novalidate: true },
    h("label", { class: "pilha-8" }, h("span", { class: "pequeno" }, "Nome de quem você ama"), nome),
    h("div", { class: "pilha-8" }, h("span", { class: "pequeno" }, "Data de nascimento"), h("div", { class: "data-campos" }, dia, mes, ano)),
    h("p", { class: "mini" }, "O nome e a data não ficam guardados no nosso servidor: a combinação é calculada na hora e fica só neste aparelho."),
    erro,
    enviar,
  );
  setTimeout(() => nome.focus({ preventScroll: false }), 0);
  return form;
}

/** Seção "Seu bônus" do resultado liberado. */
export function blocoBonusCasal({ passe }) {
  const corpo = h("div", { class: "pilha" });
  const secao = h(
    "section",
    { class: "carta carta-suave bonus-casal", "aria-labelledby": "bonus-titulo" },
    h("span", { class: "bonus-selo" }, svg(ICONES.brilho), "Seu bônus"),
    h("h2", { class: "titulo", id: "bonus-titulo" }, "Compatibilidade do casal"),
    corpo,
  );

  const mostrar = (c) => {
    // Só neste aparelho e preso a este acesso; "Apagar meus dados" também apaga.
    local.gravar("casal", { ...c, acesso: passe.slice(-16) });
    corpo.replaceChildren(resultadoCasal(c, { refazer: abrirFormulario }));
  };
  const abrirFormulario = () => corpo.replaceChildren(formulario({ passe, aoTerminar: mostrar }));
  const convite = () =>
    corpo.replaceChildren(
      h("p", { class: "apoio" }, "Descubra a combinação da sua carta com a de quem você ama: a sintonia de vocês, o que cada pessoa traz e uma frase para o casal."),
      h("button", { class: "botao botao-casal botao-largo", type: "button", onclick: abrirFormulario }, "Fazer o quiz do casal", svg(ICONES.seta)),
    );

  const salvo = local.ler("casal");
  if (salvo?.combinacao && salvo.acesso === passe.slice(-16)) corpo.replaceChildren(resultadoCasal(salvo, { refazer: abrirFormulario }));
  else convite();
  return secao;
}
