// Resultado (/r): grátis + oferta, ou completo liberado (web/TELAS.md, 5, 6, 8, 9 e 10).
// O passe vem do fragmento (#p=...), que nunca vai ao servidor nos acessos, nem a logs nem ao Pixel.
import { h, svg, trocar, ICONES, movimentoReduzido, esperar } from "../dom.js";
import { apagarTudo, local, sessao } from "../armazenamento.js";
import { post } from "../api.js";
import { CONFIG } from "../config.js";
import { emblema, grafico2x2, TEMAS } from "../emblemas.js";
import { revelarNoFundo } from "../fundo.js";
import { mostrarPista } from "../pistas.js";
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

/**
 * A carta do arquétipo. Com `animar`, ela aparece de costas e vira (só na primeira revelação
 * desta sessão e sem "reduzir movimento"); nas outras aberturas já vem de frente.
 */
function cartaArquetipo(g, { animar = false } = {}) {
  const n = g.arquetipo.numero;
  revelarNoFundo(n, TEMAS[n] ?? TEMAS[7]);
  const guia = (g.arquetipo.palavras_guia ?? []).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" · ");
  const carta = h(
    "div",
    { class: `carta-arquetipo${animar ? "" : " sem-virar"}`, role: "img", "aria-label": `Carta do arquétipo ${g.arquetipo.nome}, número ${n} de 9` },
    h("div", { class: "face verso", "aria-hidden": "true" }),
    h(
      "div",
      { class: "face frente", "aria-hidden": "true" },
      h("div", { class: "topo-carta" }, h("span", {}, `Nº ${n} de 9`), h("span", { class: "selo-inicial" }, g.inicial)),
      h("div", { class: "emblema-carta" }, svg(emblema(n, 132, 2))),
      h("div", { class: "pilha-8" }, h("span", { class: "nome-carta" }, g.arquetipo.nome), guia ? h("span", { class: "guia-carta" }, guia) : null),
      h("div", { class: "rodape-carta" }, h("span", {}, `Letra ${g.inicial}`), h("span", {}, `Jeito ${g.temperamento.nome}`)),
    ),
  );
  if (animar) setTimeout(() => carta.classList.add("virar"), 700);

  const compartilhar = h("button", { class: "botao botao-contorno nao-imprimir", type: "button" }, svg(ICONES.compartilhar), "Compartilhar minha carta");
  compartilhar.addEventListener("click", async () => {
    // Só o arquétipo e o endereço do site: nada pessoal no texto nem no link.
    const texto = `Minha carta no Segredo do Nome é ${g.arquetipo.nome}. Descubra a sua:`;
    try {
      if (navigator.share) return await navigator.share({ title: "Segredo do Nome", text: texto, url: location.origin });
      await navigator.clipboard.writeText(`${texto} ${location.origin}`);
      mostrarPista("Texto copiado. É só colar onde quiser.");
    } catch {
      // compartilhamento cancelado
    }
  });

  return h(
    "section",
    { class: "revelacao-cena", "aria-labelledby": "titulo-arquetipo" },
    h("h1", { class: "chamada-revelacao", id: "titulo-arquetipo" }, `${g.primeiro_nome}, esta é a sua carta: `, h("strong", { class: "dourado" }, g.arquetipo.nome)),
    // A entrada anima o invólucro; o giro fica só na carta (as duas animações não brigam pelo transform).
    h("div", { class: animar ? "carta-entrando" : "" }, carta),
    h("div", { class: "acoes-carta" }, compartilhar),
  );
}

function partesGratis(g) {
  return [
    h(
      "div",
      { class: "carta carta-suave jeito" },
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

  const total = r.oferta ? r.oferta.secoes.length : 0;
  const ctaTexto = `Revelar os ${total} capítulos — R$ 11,90`;
  const oferta = r.oferta
    ? h(
        "section",
        { class: "pilha", "aria-labelledby": "oferta-titulo" },
        h("span", { class: "rotulo" }, "Continue a sua descoberta"),
        h("h2", { class: "titulo", id: "oferta-titulo" }, `Sua carta tem mais ${total} capítulos, ${g.primeiro_nome}`),
        h("p", { class: "apoio" }, "Escritos para a combinação do seu nome, da sua data e do seu jeito, além da frase do seu nome e do PDF. A primeira frase de cada um já está à vista:"),
        h(
          "div",
          { class: "capitulos" },
          r.oferta.secoes.map((s, k) =>
            h(
              "div",
              { class: "capitulo" },
              h("span", { class: "num", "aria-hidden": "true" }, String(k + 1), svg(ICONES.cadeado)),
              h(
                "div",
                { class: "pilha-8" },
                h("span", { class: "capitulo-titulo" }, h("span", { class: "sr-only" }, `Capítulo ${k + 1}, trancado: `), s.titulo),
                h("span", { class: "capitulo-texto" }, `${s.primeira_frase} `, h("span", { class: "desfocado", "aria-hidden": "true" }, ENCHIMENTO)),
              ),
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
          h("button", { class: `botao botao-principal${movimentoReduzido() ? "" : " tremer"}`, type: "button", onclick: comprar }, ctaTexto),
          h("p", { class: "mini" }, `Vendido por ${CONFIG.VENDEDOR.razao_social}, CNPJ ${CONFIG.VENDEDOR.cnpj}.`),
        ),
      )
    : null;

  const barra = h("div", { class: "barra-fixa nao-imprimir" }, h("button", { class: "botao botao-principal", type: "button", onclick: comprar }, ctaTexto));
  document.querySelector(".barra-fixa")?.remove();

  // A carta vira só na primeira revelação desta sessão (vinda do quiz).
  const animar = Boolean(sessao.ler("revelar")) && !movimentoReduzido();
  sessao.gravar("revelar", null);
  trocar(
    tela,
    aviso,
    cartaArquetipo(g, { animar }),
    h(
      "div",
      { class: `depois-da-carta${animar ? " chegando" : ""}` },
      partesGratis(g),
      sentinela,
      r.oferta
        ? h(
            "div",
            { class: "carta carta-suave" },
            h("span", { class: "rotulo" }, "Capítulos da sua carta"),
            h("div", { class: "contador-partes" }, h("i", { class: "aberta" }), r.oferta.secoes.map(() => h("i")), h("span", {}, `1 de ${total + 1} aberto`)),
          )
        : null,
      oferta,
      botaoApagar(),
    ),
  );
  if (oferta) {
    // Conta "viu a oferta" quando a seção entra na tela (contador anônimo do painel).
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        evento("oferta_vista");
        obs.disconnect();
      }
    }, { threshold: 0.25 });
    obs.observe(oferta);
  }
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
        { class: "carta carta-suave comprovante", "aria-labelledby": "comp-titulo" },
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

  evento("pago_entregue");
  const secoes = r.completo.secoes.map((s, k) =>
    h(
      "section",
      { class: "secao-paga texto-longo" },
      h("span", { class: "rotulo" }, `Capítulo ${k + 1}`),
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
    cartaArquetipo(g),
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
      { class: "carta carta-suave nao-imprimir", "aria-labelledby": "link-titulo" },
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
