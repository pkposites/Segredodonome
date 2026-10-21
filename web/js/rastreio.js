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

// ---------- aviso de cookies ----------
// O Pixel não depende mais do aviso (js/chegada.js carrega na abertura). "Aceitar" só libera o Clarity.
export function escolhaCookies() {
  const c = local.ler("cookies");
  return c && c.versao === CONFIG.VERSAO_COOKIES ? c.valor : null; // "aceito" | "recusado" | null
}

export const cookiesAceitos = () => escolhaCookies() === "aceito";
/** "Recusar" = oposição à medição: nada mais vai à Meta, nem pelo navegador nem pelo Worker. */
export const recusouMedicao = () => escolhaCookies() === "recusado";

export function definirCookies(valor) {
  local.gravar("cookies", { valor, versao: CONFIG.VERSAO_COOKIES, em: new Date().toISOString() });
  if (valor === "aceito") carregarClarity();
  if (valor === "recusado") {
    if (pixelAtivo()) window.fbq("consent", "revoke");
    for (const nome of ["_fbp", "_fbc"]) {
      document.cookie = `${nome}=; max-age=0; path=/; domain=.relatoriorda.com.br`;
      document.cookie = `${nome}=; max-age=0; path=/`;
    }
  }
}

// ---------- chegada: UTMs e fbclid ----------
export function capturarChegada() {
  const q = new URLSearchParams(location.search);
  const utm = q.get("utm_campaign");
  if (utm) local.gravar("utm", { utm_campaign: utm.slice(0, 100) });
  const fbclid = q.get("fbclid");
  if (fbclid) local.gravar("fbclid", { valor: fbclid.slice(0, 500), em: Date.now() });
  if (!sessao.ler("id")) sessao.gravar("id", uuid());
  // Link de acesso (#p=...): o passe vai para o aparelho e sai da barra de endereço na hora,
  // antes de o Pixel ou o Clarity carregarem, para nenhuma ferramenta registrar o endereço com ele.
  const passe = location.hash.match(/^#p=([A-Za-z0-9_-]{20,4096})$/);
  if (passe) {
    local.gravar("passe", passe[1]);
    history.replaceState(history.state, "", "/r");
  }
  // Tira UTMs e fbclid da barra de endereço depois de guardar (não ficam no link compartilhado).
  if (utm || fbclid || q.has("utm_source")) history.replaceState(history.state, "", location.pathname + location.hash);
}

function lerCookie(nome) {
  const m = document.cookie.match(new RegExp(`(?:^|; )${nome}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : undefined;
}

// Mesmo prazo do cookie _fbc: 90 dias.
const PRAZO_FBC = 90 * 86400_000;

function fbcDoClique() {
  const guardado = local.ler("fbclid");
  return guardado && Date.now() - guardado.em < PRAZO_FBC ? `fb.1.${guardado.em}.${guardado.valor}` : undefined;
}

/** fbp, fbc e sessão para o Worker (API de Conversões). fbc do cookie, ou montado do clique guardado. */
export function identificadores() {
  if (recusouMedicao()) return { medir: false };
  return { fbp: lerCookie("_fbp"), fbc: lerCookie("_fbc") ?? fbcDoClique(), sessao_id: sessao.ler("id") ?? undefined };
}

export const utmCampaign = () => local.ler("utm")?.utm_campaign;

// ---------- Pixel ----------
// Carregado por js/chegada.js no <head> (init e PageView da chegada). Aqui só os eventos seguintes.
const pixelAtivo = () => typeof window.fbq === "function";

let clarityCarregado = false;
export function carregarClarity() {
  if (clarityCarregado || !CONFIG.CLARITY_ID || !CONFIG.DOMINIOS_OFICIAIS.includes(location.hostname)) return;
  if (!cookiesAceitos()) return;
  clarityCarregado = true;
  /* eslint-disable */
  (function (c, l, a, r, i, t, y) {
    c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
    t = l.createElement(r); t.async = 1; t.src = "https://www.clarity.ms/tag/" + i;
    y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
  })(window, document, "clarity", "script", CONFIG.CLARITY_ID);
  /* eslint-enable */
}

function pixel(nome, eventId, extra) {
  if (!pixelAtivo() || recusouMedicao()) return;
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

  const meta = TIPO_PARA_META[tipo];
  // PageView da chegada: o Pixel já mandou no <head> (js/chegada.js); o Worker recebe o mesmo event_id.
  const chegada = window.__sdnChegada;
  let eventId;
  if (meta === "PageView" && chegada && chegada.caminho === location.pathname) {
    eventId = chegada.eventId;
    window.__sdnChegada = null;
  } else {
    eventId = uuid();
    if (meta) pixel(meta, eventId);
  }
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
