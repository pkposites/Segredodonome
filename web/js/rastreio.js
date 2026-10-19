// Aviso de cookies, Pixel da Meta e contadores do funil (RASTREAMENTO_META.md).
// Só eventos padrão e parâmetros padrão. Nenhum dado pessoal vai para a Meta.
import { CONFIG } from "./config.js";
import { local, sessao, uuid } from "./armazenamento.js";
import { post } from "./api.js";

const P = CONFIG.PRODUTO;
const DADOS_PRODUTO = { value: P.valor, currency: P.moeda, content_ids: [P.id] };
const ITENS = [{ id: P.id, quantity: 1, item_price: P.valor }];

/** Mesmos custom_data que o Worker envia (worker/src/meta.ts). */
const CUSTOM = {
  PageView: undefined,
  ViewContent: { ...DADOS_PRODUTO, content_type: "product", content_name: P.nome },
  AddToCart: { ...DADOS_PRODUTO, content_type: "product", content_name: P.nome },
  AddToWishlist: { content_ids: ["casal_completo_v1"], content_name: "Compatibilidade do Casal" },
  InitiateCheckout: { ...DADOS_PRODUTO, contents: ITENS, num_items: 1 },
  AddPaymentInfo: DADOS_PRODUTO,
  Purchase: { ...DADOS_PRODUTO, contents: ITENS, num_items: 1, content_type: "product" },
};

const TIPO_PARA_META = {
  visita: "PageView",
  quiz_inicio: "PageView",
  quiz_metade: "PageView",
  resultado_visto: "ViewContent",
  comprar_toque: "AddToCart",
  pix_copiado: "AddPaymentInfo",
  pdf_salvo: null,
  // Só contadores do painel (nenhum evento novo para a Meta):
  escolha_nome: null,
  oferta_vista: null,
  pago_entregue: null,
  ...Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => [`quiz_passo_${n}`, null])),
  casal_interesse: "AddToWishlist",
};

// ---------- consentimento ----------
export function escolhaCookies() {
  const c = local.ler("cookies");
  return c && c.versao === CONFIG.VERSAO_COOKIES ? c.valor : null; // "aceito" | "recusado" | null
}

export const cookiesAceitos = () => escolhaCookies() === "aceito";

export function definirCookies(valor) {
  local.gravar("cookies", { valor, versao: CONFIG.VERSAO_COOKIES, em: new Date().toISOString() });
  if (valor === "aceito") carregarPixel();
}

// ---------- chegada: UTMs e fbclid ----------
export function capturarChegada() {
  const q = new URLSearchParams(location.search);
  const utm = q.get("utm_campaign");
  if (utm) local.gravar("utm", { utm_campaign: utm.slice(0, 100) });
  const fbclid = q.get("fbclid");
  if (fbclid) local.gravar("fbclid", { valor: fbclid.slice(0, 500), em: Date.now() });
  if (!sessao.ler("id")) sessao.gravar("id", uuid());
  // Tira UTMs e fbclid da barra de endereço depois de guardar (não ficam no link compartilhado).
  if (utm || fbclid || q.has("utm_source")) history.replaceState(history.state, "", location.pathname + location.hash);
}

function lerCookie(nome) {
  const m = document.cookie.match(new RegExp(`(?:^|; )${nome}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : undefined;
}

/** fbp, fbc e sessão, só com cookies aceitos. fbc montado do fbclid quando o _fbc não existe. */
export function identificadores() {
  if (!cookiesAceitos()) return { cookies_aceitos: false };
  const guardado = local.ler("fbclid");
  // Mesmo prazo do cookie _fbc informado na política de privacidade: 90 dias.
  const clique = guardado && Date.now() - guardado.em < 90 * 86400_000 ? guardado : null;
  const fbc = lerCookie("_fbc") ?? (clique ? `fb.1.${clique.em}.${clique.valor}` : undefined);
  return { cookies_aceitos: true, fbp: lerCookie("_fbp"), fbc, sessao_id: sessao.ler("id") ?? undefined };
}

export const utmCampaign = () => local.ler("utm")?.utm_campaign;

// ---------- Pixel ----------
let pixelCarregado = false;

export function carregarPixel() {
  if (pixelCarregado || !CONFIG.META_PIXEL_ID || !CONFIG.DOMINIOS_OFICIAIS.includes(location.hostname)) return;
  if (CONFIG.PIXEL_EXIGE_CONSENTIMENTO && !cookiesAceitos()) return;
  pixelCarregado = true;
  /* eslint-disable */
  !(function (f, b, e, v, n, t, s) {
    if (f.fbq) return;
    n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
    if (!f._fbq) f._fbq = n;
    n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = [];
    t = b.createElement(e); t.async = !0; t.src = v;
    s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
  })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  /* eslint-enable */
  // Eventos automáticos desligados ANTES do init (RASTREAMENTO_META.md, 2.1).
  window.fbq("set", "autoConfig", false, CONFIG.META_PIXEL_ID);
  window.fbq("init", CONFIG.META_PIXEL_ID);
}

function pixel(nome, eventId, extra) {
  if (!pixelCarregado || !window.fbq) return;
  const dados = extra ?? CUSTOM[nome];
  window.fbq("track", nome, dados ?? {}, { eventID: eventId });
}

// ---------- eventos ----------
/**
 * Conta a etapa (uma vez por sessão do navegador) e manda o mesmo event_id ao Pixel e ao Worker.
 * Recarregar a página não soma de novo.
 */
export function evento(tipo) {
  const marcados = sessao.ler("eventos") ?? {};
  if (marcados[tipo]) return;
  marcados[tipo] = true;
  sessao.gravar("eventos", marcados);

  const eventId = uuid();
  const meta = TIPO_PARA_META[tipo];
  if (meta) pixel(meta, eventId);
  post("/evento", { tipo, event_id: eventId, utm_campaign: utmCampaign(), variante: CONFIG.VARIANTE, ...identificadores() }, { keepalive: true }).catch(() => {});
}

/** InitiateCheckout: o servidor já mandou; o Pixel repete com o mesmo event_id. */
export function pixelCheckout(eventId) {
  pixel("InitiateCheckout", eventId);
}

/** Purchase: uma vez por pagamento (o do servidor sai no webhook com o mesmo event_id). */
export function pixelCompra(eventIdPurchase, pagamentoId) {
  const feitos = sessao.ler("compras") ?? {};
  if (feitos[eventIdPurchase]) return;
  feitos[eventIdPurchase] = true;
  sessao.gravar("compras", feitos);
  pixel("Purchase", eventIdPurchase, { ...CUSTOM.Purchase, order_id: pagamentoId });
}
