// POST /evento: contador anônimo do funil + evento padrão da Meta com o mesmo event_id do Pixel.
import { diaSaoPaulo, normalizarCampanha, normalizarVariante, type Etapa } from "../banco";
import { ErroHttp, json, lerJson } from "../http";
import { customDataProduto, ehRoboDePreVisualizacao, type NomeEventoMeta } from "../meta";
import { dadosUsuario, type Servicos } from "../servicos";
import { urlDoSite } from "./comum";

/** Etapas que o navegador pode informar (pix_gerado e pix_pago só o servidor conta). */
const MAPA: Record<string, { etapa: Etapa; meta?: NomeEventoMeta; caminho: string }> = {
  visita: { etapa: "visita", meta: "PageView", caminho: "/" },
  quiz_inicio: { etapa: "quiz_inicio", meta: "PageView", caminho: "/quiz" },
  quiz_metade: { etapa: "quiz_metade", meta: "PageView", caminho: "/quiz/parte-2" },
  resultado_visto: { etapa: "resultado_visto", meta: "ViewContent", caminho: "/r" },
  comprar_toque: { etapa: "comprar_toque", meta: "AddToCart", caminho: "/r" },
  pix_copiado: { etapa: "pix_copiado", meta: "AddPaymentInfo", caminho: "/r" },
  pdf_salvo: { etapa: "pdf_salvo", caminho: "/r" },
  // Etapas só do painel (nenhum evento novo para a Meta):
  escolha_nome: { etapa: "escolha_nome", caminho: "/" },
  oferta_vista: { etapa: "oferta_vista", caminho: "/r" },
  pago_entregue: { etapa: "pago_entregue", caminho: "/r" },
  ...Object.fromEntries(
    [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => [`quiz_passo_${n}`, { etapa: `quiz_passo_${n}` as Etapa, caminho: "/quiz" }]),
  ),
  casal_interesse: { etapa: "casal_interesse", meta: "AddToWishlist", caminho: "/" },
};

export async function postEvento(req: Request, s: Servicos): Promise<Response> {
  if (ehRoboDePreVisualizacao(req.headers.get("user-agent"))) return new Response(null, { status: 204 });
  const corpo = (await lerJson(req, 4096)) as Record<string, unknown>;
  const def = typeof corpo?.tipo === "string" ? MAPA[corpo.tipo] : undefined;
  if (!def) throw new ErroHttp(400, "tipo_invalido", "Evento desconhecido.");
  const eventId = typeof corpo.event_id === "string" && /^[\w-]{8,64}$/.test(corpo.event_id) ? corpo.event_id : null;
  if (!eventId) throw new ErroHttp(400, "event_id_invalido", "Evento sem identificador.");

  const agora = s.agora();
  await s.banco.incrementar(diaSaoPaulo(agora), def.etapa, normalizarCampanha(corpo.utm_campaign), normalizarVariante(corpo.variante));
  if (def.meta) {
    s.depois(
      s.meta.enviar({
        event_name: def.meta,
        event_id: eventId,
        event_time: Math.floor(agora.getTime() / 1000),
        event_source_url: urlDoSite(s, def.caminho),
        action_source: "website",
        user_data: await dadosUsuario(req, corpo),
        custom_data: customDataProduto(def.meta),
      }),
    );
  }
  return new Response(null, { status: 204 });
}
