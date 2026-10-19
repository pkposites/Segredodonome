// Resultado (/r): grátis + oferta, ou completo liberado (web/TELAS.md, 5, 6, 8, 9 e 10).
// O passe vem do fragmento (#p=...), que nunca vai ao servidor nos acessos, nem a logs nem ao Pixel.
import { h, svg, trocar, ICONES, movimentoReduzido, esperar } from "../dom.js";
import { apagarTudo, local, sessao } from "../armazenamento.js";
import { post } from "../api.js";
import { CONFIG } from "../config.js";
import { emblema, grafico2x2 } from "../emblemas.js";
import { evento, pixelCompra } from "../rastreio.js";
import { abrirCheckout } from "./checkout.js";
import qrcode from "../vendor/qrcode.js";

const ENCHIMENTO =
  "Este trecho continua com exemplos do dia a dia, um ponto forte e um cuidado, escritos para a combinação do seu nome, da sua data e do seu jeito.";

const AVISOS = {
  reembolsado: "Este acesso foi cancelado após reembolso. O resultado grátis continua aqui.",
  expirado: "Este link de acesso venceu (validade de 12 meses). O resultado grátis continua aqui.",
  verificacao_indisponivel: "Não conseguimos confirmar o pagamento agora. O resultado grátis continua aqui; tente abrir de novo em instantes.",
};

const dataHora = (iso) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }).format(new Date(iso));

function passeDoFragmento() {
  const m = location.hash.match(/^#p=([A-Za-z0-9_-]{20,4096})$/);
  return m ? m[1] : null;
}

const linkDeAcesso = (passe) => `${location.origin}/r#p=${passe}`;

export async function telaResultado(tela, { ir }) {
  const doLink = passeDoFragmento();
  if (doLink) local.gravar("passe", doLink);
  const passe = doLink ?? local.ler("passe");
  const entradas = local.ler("entradas");

  trocar(tela, h("div", { class: "processando" }, h("span", { class: "girador", "aria-hidden": "true" }), h("p", { class: "apoio" }, "Abrindo o seu resultado…")));

  if (passe) {
    try {
      const r = await post("/resultado", { passe });
      if (r.completo) {
        if (!doLink) history.replaceState(null, "", `/r#p=${passe}`);
        return liberado(tela, r, { passe, comprovante: local.ler("comprovante") });
      }
      return gratis(tela, r, { ir, entradas: entradas ?? null });
    } catch (e) {
      if (e.codigo === "passe_invalido") {
        local.gravar("passe", null);
        history.replaceState(null, "", "/r");
      } else {
        return erro(tela, e.message, () => telaResultado(tela, { ir }));
      }
    }
  }

  if (!entradas) return ir("/", { substituir: true });
  try {
    const r = sessao.ler("resultado") ?? (await post("/resultado", { entradas }));
    sessao.gravar("resultado", null);
    gratis(tela, r, { ir, entradas });
    recuperarEmSegundoPlano(tela, entradas);
  } catch (e) {
    erro(tela, e.message, () => telaResultado(tela, { ir }));
  }
}

function erro(tela, mensagem, tentar) {
  trocar(tela, h("p", { class: "erro", role: "alert" }, mensagem), h("button", { class: "botao botao-principal", type: "button", onclick: tentar }, "Tentar de novo"));
}

/** Perdeu o link? Refazer o quiz com o mesmo nome e data encontra o pagamento (ESPECIFICACAO.md, 4.7). */
async function recuperarEmSegundoPlano(tela, entradas) {
  if (sessao.ler("recuperacao_tentada")) return;
  sessao.gravar("recuperacao_tentada", true);
  try {
    const r = await post("/recuperar", { entradas });
    local.gravar("passe", r.passe);
    local.gravar("comprovante", r.comprovante);
    history.replaceState(null, "", `/r#p=${r.passe}`);
    liberado(tela, r, { passe: r.passe, comprovante: r.comprovante, mensagem: "Encontramos sua compra" });
  } catch {
    // 404 = sem compra; é o caso comum. Nada a mostrar.
  }
}

function cabecalhoArquetipo(g) {
  return h(
    "div",
    { class: "revelacao" },
    h("span", { class: "selo-inicial", "aria-hidden": "true" }, g.inicial),
    svg(emblema(g.arquetipo.numero, 150, 2.2)),
    h("span", { class: "chamada" }, `${g.primeiro_nome}, seu arquétipo é`),
    h("h1", {}, g.arquetipo.nome),
    g.arquetipo.palavras_guia ? h("span", { class: "guia" }, g.arquetipo.palavras_guia.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" · ")) : null,
  );
}

function partesGratis(g) {
  return [
    h(
      "div",
      { class: "card jeito" },
      svg(grafico2x2(g.temperamento.placar)),
      h("div", { class: "pilha-8" }, h("span", { class: "rotulo" }, "Seu jeito"), h("span", { class: "nome-jeito" }, g.temperamento.nome), h("span", { class: "pequeno texto-2" }, g.temperamento.frase_resposta)),
    ),
    h("section", { class: "pilha texto-longo" }, h("h2", { class: "secao" }, "Sua essência"), g.essencia.map((p) => h("p", {}, p))),
    h("div", { class: "caracteristicas", "aria-label": "Características" }, g.caracteristicas.map((c) => h("span", {}, c))),
    h("details", {}, h("summary", {}, "Como chegamos nisso"), h("p", {}, g.como_chegamos)),
  ];
}

function botaoApagar() {
  return h(
    "button",
    {
      class: "botao-texto nao-imprimir",
      type: "button",
      onclick: () => {
        if (!confirm("Apagar o seu nome, data, respostas e link de acesso deste aparelho? O nosso servidor não guarda esses dados. Se você comprou, guarde o link ou o PDF antes.")) return;
        apagarTudo();
        location.href = "/";
      },
    },
    "Apagar meus dados deste aparelho",
  );
}

function gratis(tela, r, { ir, entradas }) {
  const g = r.gratis;
  evento("resultado_visto");
  const aviso = r.aviso ? h("p", { class: "aviso", role: "status" }, AVISOS[r.aviso] ?? "") : null;
  const sentinela = h("div", { "aria-hidden": "true" });
  const comprar = () => {
    evento("comprar_toque");
    if (!entradas) return ir("/quiz");
    abrirCheckout({ entradas, gratis: g, aoAprovar: (resp) => aoAprovar(tela, resp) });
  };

  const oferta = r.oferta
    ? h(
        "section",
        { class: "pilha", "aria-labelledby": "oferta-titulo" },
        h("span", { class: "rotulo" }, "Resultado completo"),
        h("h2", { class: "titulo", id: "oferta-titulo" }, `Quer ir mais fundo, ${g.primeiro_nome}?`),
        h("p", { class: "apoio" }, `Mais ${r.oferta.secoes.length} partes escritas para a combinação do seu nome, da sua data e do seu jeito, além da frase do seu nome e do PDF.`),
        h(
          "div",
          { class: "fechadas" },
          r.oferta.secoes.map((s) =>
            h(
              "div",
              { class: "fechada" },
              h("span", { class: "cadeado" }, svg(ICONES.cadeado)),
              h("div", { class: "pilha-8" }, h("span", { class: "fechada-titulo" }, s.titulo), h("span", { class: "fechada-texto" }, `${s.primeira_frase} `, h("span", { class: "desfocado", "aria-hidden": "true" }, ENCHIMENTO))),
            ),
          ),
        ),
        h(
          "div",
          { class: "preco" },
          // Texto de legal/TEXTOS_DE_CONSENTIMENTO.md, 3 (informação pré-contratual).
          h("div", { class: "preco-linha" }, h("strong", {}, "Resultado completo do Segredo do Nome"), h("span", { class: "preco-valor" }, "R$ 11,90")),
          h(
            "ul",
            {},
            h("li", {}, "Pagamento único via Pix, sem assinatura. Acesso imediato após a confirmação, por 12 meses, com PDF para baixar."),
            h("li", {}, "Você pode desistir em até 7 dias e receber o valor de volta. ", h("a", { href: "/reembolso" }, "Política de reembolso")),
            h("li", {}, "Não enviamos e-mail: guarde o seu link de acesso ou salve o PDF."),
            h("li", {}, "Conteúdo de entretenimento, sem valor científico ou de previsão."),
          ),
          h("button", { class: `botao botao-principal${movimentoReduzido() ? "" : " tremer"}`, type: "button", onclick: comprar }, "Liberar resultado completo — R$ 11,90"),
          h("p", { class: "mini" }, `Vendido por ${CONFIG.VENDEDOR.razao_social}, CNPJ ${CONFIG.VENDEDOR.cnpj}.`),
        ),
      )
    : null;

  const barra = h("div", { class: "barra-fixa nao-imprimir" }, h("button", { class: "botao botao-principal", type: "button", onclick: comprar }, "Liberar resultado completo — R$ 11,90"));
  document.querySelector(".barra-fixa")?.remove();

  trocar(
    tela,
    aviso,
    cabecalhoArquetipo(g),
    partesGratis(g),
    sentinela,
    r.oferta
      ? h(
          "div",
          { class: "card" },
          h("span", { class: "rotulo" }, "Ainda tem muito sobre você aqui"),
          h("div", { class: "contador-partes" }, h("i", { class: "aberta" }), r.oferta.secoes.map(() => h("i")), h("span", {}, `1 de ${r.oferta.secoes.length + 1} partes aberta`)),
        )
      : null,
    oferta,
    botaoApagar(),
  );
  if (r.oferta) {
    document.body.append(barra);
    // Barra fixa só depois que a pessoa passa do resultado grátis.
    new IntersectionObserver(([e]) => barra.classList.toggle("visivel", !e.isIntersecting && e.boundingClientRect.top < 0)).observe(sentinela);
  }
  if (local.ler("pix") && entradas) comprar(); // voltou com Pix pendente: checkout pronto
}

function aoAprovar(tela, r) {
  local.gravar("passe", r.passe);
  local.gravar("comprovante", r.comprovante);
  pixelCompra(r.event_id_purchase, r.comprovante.pagamento_id);
  history.replaceState(null, "", `/r#p=${r.passe}`);
  liberado(tela, r, { passe: r.passe, comprovante: r.comprovante, mensagem: "Pagamento confirmado. Tudo liberado.", animar: true });
}

function qrSvg(texto) {
  const q = qrcode(0, "M");
  q.addData(texto);
  q.make();
  return svg(q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }));
}

async function liberado(tela, r, { passe, comprovante, mensagem, animar = false }) {
  const g = r.gratis;
  document.querySelector(".barra-fixa")?.remove();
  const link = linkDeAcesso(passe);
  const toast = mensagem ? h("div", { class: "toast", role: "status" }, svg(ICONES.ok), mensagem) : null;
  if (toast) {
    document.body.append(toast);
    setTimeout(() => toast.remove(), 4000);
  }

  const copiarLink = h("button", { class: "botao botao-contorno", type: "button" }, svg(ICONES.link), "Copiar link");
  copiarLink.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(link);
      copiarLink.replaceChildren(svg(ICONES.ok), "Link copiado");
    } catch {
      copiarLink.replaceChildren("Selecione e copie o link acima");
    }
  });
  const salvarPdf = h("button", { class: "botao botao-principal", type: "button", onclick: () => { evento("pdf_salvo"); window.print(); } }, svg(ICONES.baixar), "Salvar em PDF");

  const blocoComprovante = comprovante
    ? h(
        "section",
        { class: "card comprovante", "aria-labelledby": "comp-titulo" },
        h("h2", { class: "rotulo", id: "comp-titulo" }, "Compra confirmada"),
        h(
          "dl",
          {},
          h("dt", {}, "Pagamento nº"), h("dd", {}, comprovante.pagamento_id),
          h("dt", {}, "Data e hora"), h("dd", {}, dataHora(comprovante.data_hora)),
          h("dt", {}, "Valor"), h("dd", {}, "R$ 11,90 via Pix"),
          h("dt", {}, "Vendido por"), h("dd", {}, `${CONFIG.VENDEDOR.razao_social}, CNPJ ${CONFIG.VENDEDOR.cnpj}`),
        ),
        h("p", { class: "mini" }, `Pagamento processado pelo Mercado Pago. Desistência em até 7 dias: ${CONFIG.VENDEDOR.email} ou WhatsApp ${CONFIG.VENDEDOR.whatsapp}.`),
        h(
          "button",
          {
            class: "botao-texto",
            type: "button",
            onclick: () => {
              document.body.classList.add("imprimindo-comprovante");
              window.print();
              document.body.classList.remove("imprimindo-comprovante");
            },
          },
          "Salvar comprovante",
        ),
      )
    : null;

  const secoes = r.completo.secoes.map((s) =>
    h(
      "section",
      { class: "secao-paga texto-longo" },
      h("h2", {}, s.titulo),
      s.paragrafos.map((p) => h("p", {}, p)),
      (s.trimestres ?? []).map((t) => h("div", { class: "trimestre" }, h("b", {}, t.rotulo), h("p", {}, t.texto))),
    ),
  );

  trocar(
    tela,
    h(
      "div",
      { class: "capa so-impressao" },
      svg(emblema(g.arquetipo.numero, 120, 2)),
      h("span", { class: "nome-capa" }, g.primeiro_nome),
      h("span", { class: "serifa" }, g.arquetipo.nome),
      h("span", {}, `Letra ${g.inicial} · Jeito ${g.temperamento.nome}`),
    ),
    blocoComprovante,
    cabecalhoArquetipo(g),
    partesGratis(g),
    secoes,
    h(
      "div",
      { class: "frase-nome" },
      svg(emblema(g.arquetipo.numero, 90, 1.5)),
      h("span", { class: "rotulo" }, "A frase do seu nome"),
      h("blockquote", {}, `“${r.completo.frase_do_nome}”`),
      h("span", { class: "mini" }, `${g.primeiro_nome} · ${g.arquetipo.nome}`),
    ),
    h(
      "section",
      { class: "card nao-imprimir", "aria-labelledby": "link-titulo" },
      h("h2", { class: "rotulo", id: "link-titulo" }, "Seu link de acesso"),
      h("p", { class: "link-acesso" }, link),
      copiarLink,
      h("div", { class: "qr", "aria-label": "QR Code do link de acesso", role: "img" }, qrSvg(link)),
      h("p", { class: "pequeno apoio" }, "Abre o seu resultado completo em qualquer aparelho por 12 meses. Guarde o link ou salve o PDF. Quem tiver este link vê o seu resultado."),
      salvarPdf,
    ),
    h(
      "div",
      { class: "ultima-pagina so-impressao" },
      h("h2", { class: "serifa" }, "Seu link de acesso"),
      h("p", { class: "link-acesso" }, link),
      h("div", { class: "qr" }, qrSvg(link)),
      comprovante ? h("p", {}, `Pagamento nº ${comprovante.pagamento_id} · ${dataHora(comprovante.data_hora)} · R$ 11,90 via Pix · ${CONFIG.VENDEDOR.razao_social}, CNPJ ${CONFIG.VENDEDOR.cnpj}`) : null,
      h("p", { class: "mini" }, `${location.host} · Conteúdo de entretenimento, sem valor científico ou de previsão.`),
    ),
    botaoApagar(),
  );
  window.scrollTo(0, 0);

  if (animar && !movimentoReduzido()) {
    secoes.forEach((s) => (s.style.opacity = "0"));
    for (const s of secoes) {
      await esperar(220);
      s.style.opacity = "";
      s.classList.add("desbloqueando");
    }
  }
}
