// Roteamento, CORS, rate limit e registro de acesso (Marco Civil). Separado de index.ts
// para os testes chamarem com serviços falsos.
import { autorizarAdmin } from "./admin/access";
import { rotaAdmin } from "./admin/rotas";
import PAINEL_HTML from "./painel/gerado";
import { comCors, ErroHttp, json, origemPermitida, preflight, respostaErro } from "./http";
import { postEvento } from "./rotas/evento";
import { postCheckout, postRecuperar, postStatus } from "./rotas/pagamento";
import { postResultado } from "./rotas/resultado";
import { postWebhook } from "./rotas/webhook";
import { ipDe, type Servicos } from "./servicos";

type Rota = (req: Request, s: Servicos) => Promise<Response>;

const PUBLICAS: Record<string, Rota> = {
  "/resultado": postResultado,
  "/checkout": postCheckout,
  "/pagamento/status": postStatus,
  "/recuperar": postRecuperar,
  "/evento": postEvento,
};

const CSP_PAINEL =
  "default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

const SEGURANCA = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "x-frame-options": "DENY",
};

export async function tratar(req: Request, s: Servicos, limite?: RateLimit): Promise<Response> {
  const url = new URL(req.url);
  const caminho = url.pathname.replace(/\/+$/, "") || "/";
  const origem = origemPermitida(req, s.env.PUBLIC_BASE_URL);

  let resp: Response;
  try {
    resp = await despachar(req, s, caminho, origem, limite);
  } catch (e) {
    if (e instanceof ErroHttp) resp = respostaErro(e);
    else {
      // Sem detalhes da requisição no log: pode haver dado pessoal no corpo.
      console.error("erro interno em", caminho, e instanceof Error ? e.name : "desconhecido");
      // Com CORS: sem ele o navegador esconde o 500 e o site mostra "Sem conexão".
      resp = comCors(json({ erro: "interno", mensagem: "Algo deu errado. Tente de novo." }, 500), origem);
    }
  }
  for (const [k, v] of Object.entries(SEGURANCA)) if (!resp.headers.has(k)) resp.headers.set(k, v);

  // Marco Civil, art. 15: IP, data/hora, método, rota sem query string, status.
  s.depois(s.banco.registrarAcesso(ipDe(req), req.method, caminho.slice(0, 100), resp.status, s.agora()));
  return resp;
}

/** Conferência rápida da configuração, sem nenhum valor secreto: só "ok" ou "falta". */
function saude(s: Servicos): Response {
  const tem = (v: unknown) => (typeof v === "string" && v.length > 0 ? "ok" : "falta");
  return json({
    banco: s.env.DB ? "ligado" : "desligado",
    segredo: tem(s.env.SEGREDO_PASSE),
    mercado_pago: tem(s.env.MP_ACCESS_TOKEN),
    webhook_mercado_pago: tem(s.env.MP_WEBHOOK_SECRET),
    meta_capi: tem(s.env.META_CAPI_TOKEN),
    painel_link: (s.env.PAINEL_CHAVE?.length ?? 0) >= 24 ? "ok" : "falta",
  });
}

async function despachar(req: Request, s: Servicos, caminho: string, origem: string | null, limite?: RateLimit) {
  if (caminho === "/webhook/mercadopago" && req.method === "POST") return postWebhook(req, s);
  if (caminho === "/saude" && req.method === "GET") return saude(s);

  if (caminho === "/painel" || caminho.startsWith("/admin/")) {
    const email = await autorizarAdmin(req, s.access);
    if (!email) throw new ErroHttp(403, "proibido", "Acesso restrito.");
    if (caminho === "/painel" && req.method === "GET") {
      return new Response(PAINEL_HTML, {
        headers: { "content-type": "text/html; charset=utf-8", "content-security-policy": CSP_PAINEL, "cache-control": "no-store" },
      });
    }
    return rotaAdmin(req, s, caminho);
  }

  const rota = PUBLICAS[caminho];
  if (!rota) throw new ErroHttp(404, "nao_encontrado", "Rota não encontrada.");
  if (req.method === "OPTIONS") return preflight(origem);
  if (req.method !== "POST") throw new ErroHttp(405, "metodo", "Método não permitido.");
  if (!origem) throw new ErroHttp(403, "origem", "Origem não permitida.");

  if (limite) {
    const { success } = await limite.limit({ key: `${ipDe(req)}:${caminho}` });
    if (!success) return comCors(json({ erro: "muitas_tentativas", mensagem: "Muitas tentativas. Aguarde um pouco." }, 429), origem);
  }
  try {
    return comCors(await rota(req, s), origem);
  } catch (e) {
    if (e instanceof ErroHttp) return comCors(respostaErro(e), origem);
    throw e;
  }
}
