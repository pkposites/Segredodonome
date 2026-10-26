// Resultado (/r): grátis + oferta, ou completo liberado (web/TELAS.md, 5, 6, 8, 9 e 10).
// O passe vem do fragmento (#p=...), que nunca vai ao servidor nos acessos, nem a logs, Pixel ou Clarity:
// na chegada ele é guardado no aparelho e sai da barra de endereço.
import { h, svg, trocar, ICONES, movimentoReduzido, esperar } from "../dom.js";
import { apagarTudo, local, sessao } from "../armazenamento.js";
import { post } from "../api.js";
import { CONFIG } from "../config.js";
import { emblema, grafico2x2, TEMAS } from "../emblemas.js";
import { revelarNoFundo } from "../fundo.js";
import { mostrarPista } from "../pistas.js";
import { evento, pixelCompra } from "../rastreio.js";
import { abrirCheckout } from "./checkout.js";
import { blocoBonusCasal, vitrineBonusCasal } from "./casal.js";

const ENCHIMENTO =
  "Este trecho continua com exemplos do dia a dia, um ponto forte e um cuidado, escritos para a combinação do seu nome, da sua data e do seu jeito.";

const AVISOS = {
  reembolsado: "Este acesso foi cancelado após reembolso. O resultado grátis continua aqui.",
  expirado: "Este link de acesso venceu (validade de 12 meses). O resultado grátis continua aqui.",
  verificacao_indisponivel: "Não conseguimos confirmar o pagamento agora. O resultado grátis continua aqui; tente abrir de novo em instantes.",
};

const dataHora = (iso) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }).format(new Date(iso));

const linkDeAcesso = (passe) => `${location.origin}/r#p=${passe}`;

export async function telaResultado(tela, { ir }) {
  // O passe do link (#p=) já foi guardado e tirado do endereço na chegada (rastreio.js).
  const passe = local.ler("passe");
  const entradas = local.ler("entradas");

  trocar(tela, h("div", { class: "processando" }, h("span", { class: "girador", "aria-hidden": "true" }), h("p", { class: "apoio" }, "Abrindo o seu resultado…")));

  if (passe) {
    try {
      const r = await post("/resultado", { passe });
      if (r.completo) {
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
    history.replaceState(null, "", "/r"); // o passe fica no aparelho, nunca no endereço
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

/**
 * Pop-up da oferta: uma vez por visita, quando a pessoa termina de ler o resultado grátis
 * (ou depois de 25 s lendo). Preço real, sem preço riscado nem contagem regressiva.
 */
function agendarPopupOferta({ alvo, r, comprar }) {
  if (sessao.ler("popup_oferta") || local.ler("pix")) return;
  let feito = false;
  const abrir = () => {
    if (feito) return;
    feito = true;
    obs.disconnect();
    clearTimeout(timer);
    // Não atrapalha quem já abriu o pagamento ou saiu da tela de resultado.
    if (document.querySelector(".veu") || !document.body.contains(alvo)) return;
    sessao.gravar("popup_oferta", true);
    mostrarPopupOferta(r, comprar);
  };
  const obs = new IntersectionObserver(([e]) => e.isIntersecting && abrir(), { threshold: 0.6 });
  obs.observe(alvo);
  const timer = setTimeout(abrir, 25000);
}

function mostrarPopupOferta(r, comprar) {
  const total = r.oferta.secoes.length;
  const anterior = document.activeElement;
  const fechar = () => {
    document.removeEventListener("keydown", aoTeclar);
    veu.remove();
    anterior?.focus?.({ preventScroll: true });
  };
  const aoTeclar = (e) => e.key === "Escape" && fechar();
  const cta = h("button", { class: "botao botao-principal", type: "button", onclick: () => (fechar(), comprar()) }, `Quero ver os ${total} capítulos`);
  const caixa = h(
    "div",
    { class: "popup-oferta", role: "dialog", "aria-modal": "true", "aria-labelledby": "popup-titulo", "aria-describedby": "popup-texto" },
    h("button", { class: "icone-botao popup-fechar", type: "button", "aria-label": "Fechar", onclick: fechar }, svg(ICONES.fechar)),
    h("span", { class: "popup-selo", "aria-hidden": "true" }, svg(ICONES.cadeado)),
    h("span", { class: "rotulo" }, "Calma, ainda não acabou"),
    h("h2", { class: "titulo", id: "popup-titulo" }, `Você não vai acreditar em tudo que a sua carta ainda guarda, ${r.gratis.primeiro_nome}`),
    h("p", { class: "apoio", id: "popup-texto" }, `São mais ${total} capítulos escritos para a combinação do seu nome, da sua data e do seu jeito, com a frase do seu nome, o PDF para guardar e o bônus Compatibilidade do casal.`),
    h("p", { class: "popup-proximo" }, h("span", { class: "mini" }, "Próximo capítulo"), h("strong", {}, r.oferta.secoes[0].titulo)),
    h("p", { class: "popup-preco" }, h("strong", {}, CONFIG.PRECO_TEXTO), h("span", { class: "mini" }, "Pix · pagamento único · 7 dias para desistir")),
    cta,
    h("button", { class: "botao-texto", type: "button", onclick: fechar }, "Agora não"),
  );
  const veu = h("div", { class: "veu veu-centro nao-imprimir", onclick: (e) => e.target === veu && fechar() }, caixa);
  document.addEventListener("keydown", aoTeclar);
  document.body.append(veu);
  cta.focus({ preventScroll: true });
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
  const ctaTexto = `Revelar os ${total} capítulos — ${CONFIG.PRECO_TEXTO}`;
  const oferta = r.oferta
    ? h(
        "section",
        { class: "pilha", "aria-labelledby": "oferta-titulo" },
        h("span", { class: "rotulo" }, "Continue a sua descoberta"),
        h("h2", { class: "titulo", id: "oferta-titulo" }, `Sua carta tem mais ${total} capítulos, ${g.primeiro_nome}`),
        h("p", { class: "apoio" }, "Escritos para a combinação do seu nome, da sua data e do seu jeito. A primeira frase de cada um já está à vista:"),
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
        vitrineBonusCasal(g),
        h(
          "div",
          { class: "o-que-recebe" },
          h("span", { class: "rotulo" }, "O que você recebe"),
          h(
            "ul",
            {},
            h("li", {}, svg(ICONES.ok), `Os ${total} capítulos da sua carta, escritos para você`),
            h("li", {}, svg(ICONES.ok), "A frase do seu nome"),
            h("li", {}, svg(ICONES.ok), "PDF para guardar e link de acesso por 12 meses"),
            h("li", {}, svg(ICONES.ok), h("strong", {}, "Bônus: "), "Compatibilidade do casal"),
          ),
        ),
        h(
          "div",
          { class: "preco" },
          // Texto de legal/TEXTOS_DE_CONSENTIMENTO.md, 3 (informação pré-contratual).
          h("div", { class: "preco-linha" }, h("strong", {}, "Resultado completo do Segredo do Nome"), h("span", { class: "preco-valor" }, CONFIG.PRECO_TEXTO)),
          h(
            "ul",
            {},
            h("li", {}, "Pagamento único via Pix, sem assinatura. Acesso imediato após a confirmação, por 12 meses, com PDF para baixar."),
            h("li", {}, "Você pode desistir em até 7 dias e receber o valor de volta. ", h("a", { href: "/reembolso" }, "Política de reembolso")),
            h("li", {}, "Não enviamos e-mail: guarde o seu link de acesso ou salve o PDF."),
            h("li", {}, "Conteúdo de entretenimento, sem valor científico ou de previsão."),
          ),
          h("span", { class: "seta-cta", "aria-hidden": "true" }, svg(ICONES.baixo)),
          h("button", { class: `botao botao-principal${movimentoReduzido() ? "" : " tremer"}`, type: "button", onclick: comprar }, ctaTexto),
          h("p", { class: "mini" }, `Vendido por ${CONFIG.VENDEDOR.razao_social}, CNPJ ${CONFIG.VENDEDOR.cnpj}.`),
        ),
      )
    : null;

  // Chamariz logo depois do resultado grátis: seta que se mexe e leva até a oferta.
  const chamariz = oferta
    ? h(
        "button",
        {
          class: "chamariz nao-imprimir",
          type: "button",
          onclick: () => oferta.scrollIntoView({ behavior: movimentoReduzido() ? "auto" : "smooth", block: "start" }),
        },
        h("span", { class: "chamariz-rotulo" }, "Sua carta continua"),
        h("span", { class: "chamariz-texto" }, `Mais ${total} capítulos esperando por você`),
        h("span", { class: "chamariz-seta", "aria-hidden": "true" }, svg(ICONES.baixo)),
      )
    : null;

  // Barra fixa com o nome da pessoa: aparece logo depois da carta e some quando o preço está na tela.
  const partes = partesGratis(g);
  // Gancho dentro do resultado grátis: a primeira frase real de um capítulo pago (já é pública na oferta).
  const capGancho = r.oferta?.secoes.find((s) => s.id === "como_ama") ?? r.oferta?.secoes[0];
  const gancho = capGancho
    ? h(
        "aside",
        { class: "gancho nao-imprimir", "aria-label": "Prévia de um capítulo trancado" },
        h("span", { class: "rotulo" }, svg(ICONES.cadeado), `Capítulo trancado · ${capGancho.titulo}`),
        h("p", { class: "gancho-texto" }, `${capGancho.primeira_frase} `, h("span", { class: "desfocado", "aria-hidden": "true" }, ENCHIMENTO)),
        h(
          "button",
          { class: "botao-texto gancho-botao", type: "button", onclick: () => oferta?.scrollIntoView({ behavior: movimentoReduzido() ? "auto" : "smooth", block: "start" }) },
          "Continuar lendo",
          svg(ICONES.seta),
        ),
      )
    : null;

  const barra = h(
    "div",
    { class: "barra-fixa barra-oferta nao-imprimir" },
    h("div", { class: "barra-texto" }, h("strong", {}, `${g.primeiro_nome}, sua carta continua`), h("span", { class: "mini" }, `${total} capítulos + bônus do casal`)),
    h("button", { class: "botao botao-principal", type: "button", onclick: comprar }, `Ver tudo · ${CONFIG.PRECO_TEXTO}`),
  );
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
      gancho ? [...partes.slice(0, 2), gancho, ...partes.slice(2)] : partes,
      chamariz,
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
    // Capítulos entram um a um quando a oferta aparece na tela.
    const capitulos = oferta.querySelector(".capitulos");
    capitulos.classList.add("revelar");
    const obsCap = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        capitulos.classList.add("visivel");
        obsCap.disconnect();
      }
    }, { threshold: 0.15 });
    obsCap.observe(capitulos);
    agendarPopupOferta({ alvo: chamariz, r, comprar });
  }
  if (r.oferta) {
    document.body.append(barra);
    // Barra fixa a partir do momento em que a carta sai da tela; some enquanto o preço está à vista.
    const estado = { passouCarta: false, precoNaTela: false };
    const atualizar = () => barra.classList.toggle("visivel", estado.passouCarta && !estado.precoNaTela);
    const cena = tela.querySelector(".revelacao-cena");
    new IntersectionObserver(([e]) => {
      estado.passouCarta = !e.isIntersecting && e.boundingClientRect.top < 0;
      atualizar();
    }).observe(cena ?? sentinela);
    const caixaPreco = oferta?.querySelector(".preco");
    if (caixaPreco) {
      new IntersectionObserver(([e]) => {
        estado.precoNaTela = e.isIntersecting;
        atualizar();
      }).observe(caixaPreco);
    }
  }
  if (local.ler("pix") && entradas) comprar(); // voltou com Pix pendente: checkout pronto
}

/** Valor que a pessoa pagou (o preço mudou em 23/10/2026; comprovantes antigos guardados não têm o campo). */
function valorPago(comprovante) {
  const v = typeof comprovante.valor === "number" ? comprovante.valor : 11.9;
  return `R$ ${v.toFixed(2).replace(".", ",")}`;
}

function aoAprovar(tela, r) {
  local.gravar("passe", r.passe);
  local.gravar("comprovante", r.comprovante);
  pixelCompra(r.event_id_purchase, r.comprovante.pagamento_id, r.comprovante.valor);
  history.replaceState(null, "", "/r"); // o passe fica no aparelho, nunca no endereço
  liberado(tela, r, { passe: r.passe, comprovante: r.comprovante, mensagem: "Pagamento confirmado. Tudo liberado.", animar: true });
}

/** QR do link. A biblioteca (56 KB) só é baixada aqui, não na página inicial. */
function qrSvg(texto) {
  const lugar = h("span", { class: "qr-lugar" });
  import("../vendor/qrcode.js").then(({ default: qrcode }) => {
    const q = qrcode(0, "M");
    q.addData(texto);
    q.make();
    lugar.replaceWith(svg(q.createSvgTag({ cellSize: 4, margin: 2, scalable: true })));
  });
  return lugar;
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
          h("dt", {}, "Valor"), h("dd", {}, `${valorPago(comprovante)} via Pix`),
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
    blocoBonusCasal({ passe }),
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
      comprovante ? h("p", {}, `Pagamento nº ${comprovante.pagamento_id} · ${dataHora(comprovante.data_hora)} · ${valorPago(comprovante)} via Pix · ${CONFIG.VENDEDOR.razao_social}, CNPJ ${CONFIG.VENDEDOR.cnpj}`) : null,
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
