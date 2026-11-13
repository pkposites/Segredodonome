// Checkout Pix em painel deslizante. O adicional do casal é escolhido antes de gerar o Pix,
// e o valor cobrado é o do servidor. No celular, o copia-e-cola fica sempre visível.
import { h, svg, trocar, ICONES } from "../dom.js";
import { local, uuid } from "../armazenamento.js";
import { post } from "../api.js";
import { CONFIG } from "../config.js";
import { emblema } from "../emblemas.js";
import { evento, identificadores, pixelCheckout, utmCampaign } from "../rastreio.js";

const INTERVALO_MS = 4000;
const WHATSAPP_ATENDIMENTO = `https://wa.me/55${CONFIG.VENDEDOR.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent("Olá! Tenho uma dúvida sobre o pagamento do Segredo do Nome.")}`;
const NAVEGADOR_APP = /Instagram|FBAN|FBAV|FB_IAB|FBIOS|Messenger/i.test(navigator.userAgent);

const reais = (centavos) => (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const hora = (iso) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

const ajudaWhatsapp = () =>
  h("p", { class: "mini centro" }, "Dúvida com o pagamento? ", h("a", { href: WHATSAPP_ATENDIMENTO, target: "_blank", rel: "noopener" }, "Fale conosco pelo WhatsApp"));

/**
 * Abre o painel.
 * `pedido.produto`: "nome" (padrão), "casal" ou "segundo_nome".
 * `aoAprovar(resposta)` recebe o JSON de /pagamento/status.
 */
export function abrirCheckout({ entradas, gratis, aoAprovar, pedido = {} }) {
  document.querySelector(".veu")?.remove();
  const produto = pedido.produto ?? "nome";
  const folha = h("div", { class: "folha", role: "dialog", "aria-modal": "true", "aria-labelledby": "checkout-titulo" });
  const veu = h("div", { class: "veu", onclick: (e) => e.target === veu && fechar() }, folha);
  let timer = null;
  let ativo = true;
  let comBump = false;
  evento("checkout_clicado");

  function fechar() {
    ativo = false;
    clearTimeout(timer);
    document.removeEventListener("visibilitychange", aoVoltar);
    document.removeEventListener("keydown", aoTeclar);
    veu.remove();
    document.querySelector(".barra-fixa")?.classList.remove("oculta");
  }
  const aoTeclar = (e) => e.key === "Escape" && fechar();
  document.addEventListener("keydown", aoTeclar);

  const valorCentavos = () => (produto === "casal" ? CONFIG.PRECO_CASAL_CENTAVOS : produto === "segundo_nome" ? CONFIG.PRECO_CENTAVOS : comBump ? CONFIG.PRECO_CENTAVOS + CONFIG.PRECO_CASAL_CENTAVOS : CONFIG.PRECO_CENTAVOS);

  const cabeca = (valor) => [
    h("div", { class: "folha-alca", "aria-hidden": "true" }),
    h("div", { class: "card-cabeca" }, h("h2", { id: "checkout-titulo", class: "rotulo" }, "Pagamento"), h("button", { class: "icone-botao", type: "button", "aria-label": "Fechar", onclick: fechar }, svg(ICONES.fechar))),
    h(
      "div",
      { class: "resumo" },
      h("span", { class: "emblema-mini" }, svg(emblema(gratis.arquetipo.numero, 26, 6))),
      h(
        "div",
        { class: "pilha-8" },
        h("strong", {}, produto === "casal" ? "Compatibilidade do casal" : produto === "segundo_nome" ? "Leitura de outro nome" : `Resultado completo · ${gratis.arquetipo.nome}`),
        h("span", { class: "mini" }, produto === "nome" ? `${gratis.primeiro_nome} · capítulos, frase do nome, PDF e link por 12 meses` : "Pagamento único, separado da sua carta"),
      ),
      h("span", { class: "valor", id: "checkout-valor" }, typeof valor === "number" ? reais(Math.round(valor * 100)) : reais(valorCentavos())),
    ),
  ];

  const selo = () =>
    h(
      "p",
      { class: "selo-mp" },
      svg(ICONES.ok),
      "Pagamento seguro via Mercado Pago · garantia de 7 dias",
    );

  const rodapeFolha = () =>
    h("p", { class: "mini" }, `Pagamento processado pelo Mercado Pago · 7 dias para desistir · ${CONFIG.VENDEDOR.razao_social}, CNPJ ${CONFIG.VENDEDOR.cnpj}`);

  function telaEscolha() {
    const caixa = h("input", { type: "checkbox", id: "bump-casal" });
    const preco = h("span", { class: "valor", id: "checkout-valor" }, reais(valorCentavos()));
    const botao = h("button", { class: "botao botao-principal", type: "button" }, `Gerar Pix · ${reais(CONFIG.PRECO_CENTAVOS)}`);
    const atualizar = () => {
      comBump = caixa.checked;
      preco.textContent = reais(valorCentavos());
      botao.textContent = `Gerar Pix · ${reais(valorCentavos())}`;
    };
    caixa.addEventListener("change", atualizar);
    botao.addEventListener("click", () => gerarPix());
    trocar(
      folha,
      h("div", { class: "folha-alca", "aria-hidden": "true" }),
      h("div", { class: "card-cabeca" }, h("h2", { id: "checkout-titulo", class: "rotulo" }, "Pagamento"), h("button", { class: "icone-botao", type: "button", "aria-label": "Fechar", onclick: fechar }, svg(ICONES.fechar))),
      h(
        "div",
        { class: "resumo" },
        h("span", { class: "emblema-mini" }, svg(emblema(gratis.arquetipo.numero, 26, 6))),
        h("div", { class: "pilha-8" }, h("strong", {}, `Resultado completo · ${gratis.arquetipo.nome}`), h("span", { class: "mini" }, `${gratis.primeiro_nome} · capítulos, frase do nome, PDF e link por 12 meses`)),
        preco,
      ),
      h(
        "ul",
        { class: "o-que-recebe lista-checkout" },
        h("li", {}, svg(ICONES.ok), "Os capítulos da sua carta, a frase do seu nome, PDF e link por 12 meses"),
        h("li", {}, svg(ICONES.ok), "Garantia de 7 dias: desistiu, devolvemos"),
        h("li", {}, svg(ICONES.ok), "Pagamento seguro via Mercado Pago"),
      ),
      h(
        "label",
        { class: "bump", for: "bump-casal" },
        caixa,
        h(
          "span",
          {},
          h("strong", {}, `Incluir Compatibilidade do casal · +${CONFIG.PRECO_CASAL_TEXTO}`),
          h("span", { class: "mini" }, "Opcional. A combinação da sua carta com a de quem você ama, depois do pagamento. Sem esta opção, o Pix fica em " + CONFIG.PRECO_TEXTO + "."),
        ),
      ),
      botao,
      selo(),
      rodapeFolha(),
    );
  }

  function entradasDaConsulta() {
    if (produto === "segundo_nome" && pedido.parceria) {
      return { nome: pedido.parceria.nome, data_nascimento: pedido.parceria.data, tratamento: "neutro", respostas: [1, 1, 1, 1, 1] };
    }
    return entradas;
  }

  async function gerarPix(chave = uuid()) {
    trocar(
      folha,
      cabeca(),
      h("div", { class: "qr qr-carregando", "aria-hidden": "true" }, h("span", { class: "girador girador-grande" })),
      h("p", { class: "gerando", role: "status" }, "Gerando seu Pix…"),
      h("p", { class: "mini centro" }, "Pague com o app de qualquer banco. Não precisa ter conta no Mercado Pago."),
      rodapeFolha(),
    );
    try {
      const r = await post("/checkout", {
        entradas: produto === "nome" ? entradas : undefined,
        produto,
        incluir_casal: produto === "nome" && comBump,
        passe: pedido.passe,
        parceria: produto === "segundo_nome" && pedido.parceria ? { nome: pedido.parceria.nome, data_nascimento: pedido.parceria.data } : undefined,
        idempotency_key: chave,
        utm_campaign: utmCampaign(),
        variante: CONFIG.VARIANTE,
        ...identificadores(),
      });
      pixelCheckout(r.event_id_checkout, r.valor);
      const pix = {
        pagamento_id: r.pagamento_id,
        copia_e_cola: r.copia_e_cola,
        qr_code_base64: r.qr_code_base64,
        ticket_url: r.ticket_url,
        expira_em: r.expira_em,
        valor: r.valor,
        produto,
      };
      if (produto === "nome") local.gravar("pix", pix);
      if (ativo) telaPix(pix);
    } catch (e) {
      if (ativo) telaErro(e.message, e.status && e.status < 500 ? uuid() : chave);
    }
  }

  function telaErro(mensagem, chave) {
    const tentar = h("button", { class: "botao botao-principal", type: "button", onclick: () => (produto === "nome" ? telaEscolha() : gerarPix(chave)) }, "Tentar de novo");
    trocar(folha, cabeca(), h("p", { class: "erro", role: "alert" }, mensagem || "Não foi possível gerar o Pix. Tente de novo."), tentar, ajudaWhatsapp(), rodapeFolha());
    tentar.focus();
  }

  function campoWhatsapp(pix) {
    const numero = h("input", { class: "campo", type: "tel", inputmode: "tel", autocomplete: "tel", placeholder: "(11) 99999-0000", "aria-label": "WhatsApp, opcional" });
    const aceite = h("input", { type: "checkbox", id: "aceite-whatsapp" });
    const aviso = h("p", { class: "mini", role: "status" });
    const guardar = h("button", { class: "botao botao-contorno", type: "button" }, "Guardar WhatsApp");
    guardar.addEventListener("click", async () => {
      if (!aceite.checked) {
        aviso.textContent = "Marque a autorização para guardarmos o número.";
        return;
      }
      guardar.disabled = true;
      try {
        await post("/recuperacao/contato", {
          pagamento_id: pix.pagamento_id,
          entradas: entradasDaConsulta(),
          whatsapp: numero.value,
          consentimento: true,
          versao: CONFIG.VERSAO_WHATSAPP,
        });
        aviso.textContent = "Número guardado. Se o Pix ficar em aberto, podemos te chamar neste WhatsApp com o link. Sem propaganda.";
      } catch (e) {
        aviso.textContent = e.message || "Não foi possível guardar o número.";
        guardar.disabled = false;
      }
    });
    return h(
      "form",
      { class: "whatsapp-pix", onsubmit: (e) => e.preventDefault() },
      h("p", { class: "mini" }, "Opcional. Se quiser, guardamos seu WhatsApp para te enviar o link deste Pix, caso você não conclua agora."),
      numero,
      h(
        "label",
        { class: "consentimento", for: "aceite-whatsapp" },
        aceite,
        h("span", {}, "Autorizo guardar este WhatsApp só para me enviar o link deste Pix se eu não pagar. Sem mensagens de propaganda. Posso pedir para parar respondendo SAIR."),
      ),
      guardar,
      aviso,
    );
  }

  async function copiarCodigo(pix, campo, botao) {
    evento("pix_copiado");
    campo.focus();
    campo.select();
    let copiou = false;
    try {
      await navigator.clipboard.writeText(pix.copia_e_cola);
      copiou = true;
    } catch {
      try {
        copiou = document.execCommand("copy");
      } catch {
        copiou = false;
      }
    }
    botao.replaceChildren(svg(copiou ? ICONES.ok : ICONES.copiar), copiou ? "Código copiado" : "Segure o código e copie");
  }

  function telaPix(pix) {
    const status = h("div", { class: "aguardando", role: "status" }, h("span", { class: "girador", "aria-hidden": "true" }), "Aguardando o pagamento. A página libera sozinha.");
    const campo = h("textarea", {
      class: "codigo-pix",
      readonly: true,
      rows: "4",
      "aria-label": "Código Pix copia e cola",
    }, pix.copia_e_cola ?? "");
    const copiar = h("button", { class: "botao botao-principal", type: "button" }, svg(ICONES.copiar), "Copiar código Pix");
    copiar.addEventListener("click", () => copiarCodigo(pix, campo, copiar));
    let img = null;
    if (pix.qr_code_base64 && /^[A-Za-z0-9+/=]+$/.test(pix.qr_code_base64)) {
      img = h("img", { alt: "QR Code do Pix", width: "188", height: "188", src: `data:image/png;base64,${pix.qr_code_base64}` });
    }
    const noApp = NAVEGADOR_APP
      ? h(
          "p",
          { class: "aviso aviso-app" },
          "Você está no navegador do Instagram ou do Facebook. Se o código não copiar, toque nos três pontos e escolha Abrir no navegador.",
        )
      : null;
    trocar(
      folha,
      cabeca(pix.valor),
      noApp,
      h("p", { class: "instrucao-pix" }, "App do banco → Pix → Copia e cola"),
      campo,
      copiar,
      pix.ticket_url ? h("a", { class: "botao botao-contorno", href: pix.ticket_url, target: "_blank", rel: "noopener" }, "Abrir página do Mercado Pago") : null,
      pix.expira_em ? h("p", { class: "pequeno apoio" }, `Válido até ${hora(pix.expira_em)}`) : null,
      img ? h("details", { class: "qr-secundario" }, h("summary", {}, "Ver QR Code"), h("div", { class: "qr" }, img)) : null,
      status,
      h("button", { class: "botao botao-contorno", type: "button", onclick: () => consultar(true) }, "Já paguei"),
      campoWhatsapp(pix),
      ajudaWhatsapp(),
      selo(),
      rodapeFolha(),
    );
    agendar(pix);
  }

  function telaExpirado() {
    if (produto === "nome") local.gravar("pix", null);
    trocar(
      folha,
      cabeca(),
      h("p", { class: "aviso" }, "Este Pix expirou ou foi cancelado. Nenhum valor foi cobrado."),
      h("button", { class: "botao botao-principal", type: "button", onclick: () => (produto === "nome" ? telaEscolha() : gerarPix()) }, "Gerar novo Pix"),
      rodapeFolha(),
    );
  }

  let pixAtual = null;
  function agendar(pix) {
    pixAtual = pix;
    clearTimeout(timer);
    timer = setTimeout(() => consultar(false), INTERVALO_MS);
  }

  async function consultar(forcado) {
    if (!ativo || !pixAtual) return;
    clearTimeout(timer);
    try {
      const r = await post("/pagamento/status", { pagamento_id: pixAtual.pagamento_id, entradas: entradasDaConsulta(), ...identificadores() });
      if (!ativo) return;
      if (r.status === "approved") {
        if (produto === "nome") local.gravar("pix", null);
        fechar();
        return aoAprovar(r);
      }
      if (r.status !== "pending") return telaExpirado();
      if (forcado) folha.querySelector('[role="status"]')?.replaceChildren("Ainda não recebemos a confirmação. Assim que o banco confirmar, a página libera sozinha.");
    } catch (e) {
      if (e.status === 404) return telaExpirado();
    }
    agendar(pixAtual);
  }

  const aoVoltar = () => document.visibilityState === "visible" && consultar(false);
  document.addEventListener("visibilitychange", aoVoltar);

  document.body.append(veu);
  document.querySelector(".barra-fixa")?.classList.add("oculta");
  const pendente = produto === "nome" ? local.ler("pix") : null;
  if (pendente && (!pendente.expira_em || Date.parse(pendente.expira_em) > Date.now())) telaPix(pendente);
  else if (produto === "nome") {
    local.gravar("pix", null);
    telaEscolha();
  } else gerarPix();
  return { fechar };
}
