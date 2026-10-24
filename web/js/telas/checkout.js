// Checkout Pix em painel deslizante (web/TELAS.md, 7). Sem e-mail e sem segundo toque: ao abrir,
// o Pix é gerado na hora (o Worker usa um endereço técnico do site) e o QR Code aparece direto.
import { h, svg, trocar, ICONES } from "../dom.js";
import { local, uuid } from "../armazenamento.js";
import { post } from "../api.js";
import { CONFIG } from "../config.js";
import { emblema } from "../emblemas.js";
import { evento, identificadores, pixelCheckout, utmCampaign } from "../rastreio.js";

const INTERVALO_MS = 4000;
const hora = (iso) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

/**
 * Abre o painel. `aoAprovar(resposta)` recebe { passe, comprovante, gratis, completo, event_id_purchase }.
 * Se já houver um Pix pendente salvo neste aparelho (voltou do app do banco), retoma direto nele.
 */
export function abrirCheckout({ entradas, gratis, aoAprovar }) {
  document.querySelector(".veu")?.remove();
  const folha = h("div", { class: "folha", role: "dialog", "aria-modal": "true", "aria-labelledby": "checkout-titulo" });
  const veu = h("div", { class: "veu", onclick: (e) => e.target === veu && fechar() }, folha);
  let timer = null;
  let ativo = true;

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

  const cabeca = () => [
    h("div", { class: "folha-alca", "aria-hidden": "true" }),
    h("div", { class: "card-cabeca" }, h("h2", { id: "checkout-titulo", class: "rotulo" }, "Pagamento"), h("button", { class: "icone-botao", type: "button", "aria-label": "Fechar", onclick: fechar }, svg(ICONES.fechar))),
    h(
      "div",
      { class: "resumo" },
      h("span", { class: "emblema-mini" }, svg(emblema(gratis.arquetipo.numero, 26, 6))),
      h("div", { class: "pilha-8" }, h("strong", {}, `Resultado completo · ${gratis.arquetipo.nome}`), h("span", { class: "mini" }, `${gratis.primeiro_nome} · na tela, em PDF e por link (12 meses)`)),
      h("span", { class: "valor" }, CONFIG.PRECO_TEXTO),
    ),
  ];
  const rodapeFolha = () =>
    h("p", { class: "mini" }, `Pagamento processado pelo Mercado Pago · 7 dias para desistir · ${CONFIG.VENDEDOR.razao_social}, CNPJ ${CONFIG.VENDEDOR.cnpj}`);

  /**
   * Gera o Pix assim que o painel abre (sem segundo toque). `chave` é a idempotency_key desta
   * tentativa: repetir com a mesma chave devolve o mesmo Pix; erro 4xx troca a chave.
   */
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
      // Endereço técnico só para Workers anteriores, que ainda exigem o campo; o atual o ignora.
      const email = `pix-${chave.slice(0, 8)}@relatoriorda.com.br`;
      const r = await post("/checkout", { entradas, email, idempotency_key: chave, utm_campaign: utmCampaign(), variante: CONFIG.VARIANTE, ...identificadores() });
      pixelCheckout(r.event_id_checkout);
      const pix = { pagamento_id: r.pagamento_id, copia_e_cola: r.copia_e_cola, qr_code_base64: r.qr_code_base64, expira_em: r.expira_em };
      // Guardado mesmo se o painel já foi fechado: ao reabrir, retoma este Pix (nunca gera outro).
      local.gravar("pix", pix);
      if (ativo) telaPix(pix);
    } catch (e) {
      if (ativo) telaErro(e.message, e.status && e.status < 500 ? uuid() : chave);
    }
  }

  function telaErro(mensagem, chave) {
    const tentar = h("button", { class: "botao botao-principal", type: "button", onclick: () => gerarPix(chave) }, "Tentar de novo");
    trocar(
      folha,
      cabeca(),
      h("p", { class: "erro", role: "alert" }, mensagem || "Não foi possível gerar o Pix. Tente de novo."),
      tentar,
      rodapeFolha(),
    );
    tentar.focus();
  }

  function telaPix(pix) {
    const status = h("div", { class: "aguardando", role: "status" }, h("span", { class: "girador", "aria-hidden": "true" }), "Aguardando o pagamento. A página libera sozinha.");
    const copiar = h("button", { class: "botao botao-principal", type: "button" }, svg(ICONES.copiar), "Copiar código Pix");
    copiar.addEventListener("click", async () => {
      evento("pix_copiado");
      try {
        await navigator.clipboard.writeText(pix.copia_e_cola);
        copiar.replaceChildren(svg(ICONES.ok), "Código copiado");
      } catch {
        copiar.replaceChildren("Copie o código abaixo");
        codigo.hidden = false;
      }
    });
    const codigo = h("p", { class: "link-acesso", hidden: true }, pix.copia_e_cola ?? "");
    let img;
    if (pix.qr_code_base64 && /^[A-Za-z0-9+/=]+$/.test(pix.qr_code_base64)) {
      img = h("img", { alt: "QR Code do Pix", width: "188", height: "188", src: `data:image/png;base64,${pix.qr_code_base64}` });
    } else {
      // Sem imagem do Mercado Pago: desenha o QR a partir do copia e cola.
      img = h("span", { class: "qr-lugar" });
      const lugar = img;
      import("../vendor/qrcode.js").then(({ default: qrcode }) => {
        const q = qrcode(0, "M");
        q.addData(pix.copia_e_cola ?? "");
        q.make();
        lugar.replaceWith(svg(q.createSvgTag({ cellSize: 4, margin: 2, scalable: true })));
      });
    }
    trocar(
      folha,
      cabeca(),
      h("div", { class: "qr" }, img),
      pix.expira_em ? h("p", { class: "pequeno apoio" }, `Expira às ${hora(pix.expira_em)}`) : null,
      copiar,
      codigo,
      status,
      h("button", { class: "botao botao-contorno", type: "button", onclick: () => consultar(true) }, "Já paguei"),
      rodapeFolha(),
    );
    agendar(pix);
  }

  function telaExpirado() {
    local.gravar("pix", null);
    trocar(
      folha,
      cabeca(),
      h("p", { class: "aviso" }, "Este Pix expirou ou foi cancelado. Nenhum valor foi cobrado."),
      h("button", { class: "botao botao-principal", type: "button", onclick: () => gerarPix() }, "Gerar novo Pix"),
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
      const r = await post("/pagamento/status", { pagamento_id: pixAtual.pagamento_id, entradas, ...identificadores() });
      if (!ativo) return;
      if (r.status === "approved") {
        local.gravar("pix", null);
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

  // Pagou no app do banco e voltou: consulta na hora.
  const aoVoltar = () => document.visibilityState === "visible" && consultar(false);
  document.addEventListener("visibilitychange", aoVoltar);

  document.body.append(veu);
  document.querySelector(".barra-fixa")?.classList.add("oculta");
  const pendente = local.ler("pix");
  if (pendente && (!pendente.expira_em || Date.parse(pendente.expira_em) > Date.now())) telaPix(pendente);
  else {
    local.gravar("pix", null);
    gerarPix();
  }
  return { fechar };
}
