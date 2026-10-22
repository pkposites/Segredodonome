// POST /webhook/mercadopago (ARQUITETURA.md, 3.3). Não grava dado de cliente: só o ID do
// pagamento em pagamentos_contados, para o painel não contar a mesma venda duas vezes.
import { diaSaoPaulo, normalizarCampanha, normalizarVariante } from "../banco";
import { centavos, PRODUTO_NOME } from "../catalogo";
import { json } from "../http";
import { assinaturaWebhookValida } from "../mercadopago";
import { customDataProduto } from "../meta";
import { PREFIXO_REFERENCIA } from "../motor/semente";
import type { Servicos } from "../servicos";
import { urlDoSite } from "./comum";

const texto = (v: unknown) => (typeof v === "string" && v.length > 0 && v.length < 256 ? v : undefined);

export async function postWebhook(req: Request, s: Servicos): Promise<Response> {
  const url = new URL(req.url);
  const corpo = (await req.json().catch(() => ({}))) as { type?: string; data?: { id?: unknown } };
  const dataId = url.searchParams.get("data.id") ?? (corpo.data?.id != null ? String(corpo.data.id) : null);

  const valida = await assinaturaWebhookValida(
    s.env.MP_WEBHOOK_SECRET,
    req.headers.get("x-signature"),
    req.headers.get("x-request-id"),
    dataId,
  );
  if (!valida) return json({ erro: "assinatura_invalida", mensagem: "Assinatura inválida." }, 401);

  const tipo = url.searchParams.get("type") ?? corpo.type;
  if (tipo !== "payment" || !dataId) return json({ ok: true });

  // Sempre consulta a API: o corpo da notificação nunca é usado como fonte de verdade.
  const p = await s.mp.obter(dataId);
  const vende =
    p !== null &&
    p.status === "approved" &&
    p.valor_reembolsado === 0 &&
    centavos(p.valor) === PRODUTO_NOME.precoCentavos &&
    p.moeda === PRODUTO_NOME.moeda &&
    (p.external_reference ?? "").startsWith(PREFIXO_REFERENCIA);
  if (!p || !vende) return json({ ok: true });

  const aprovado = new Date(p.aprovado_em ?? p.criado_em);
  const agora = s.agora();
  if (await s.banco.marcarPagamentoContado(p.id, agora)) {
    await s.banco.incrementar(
      diaSaoPaulo(aprovado),
      "pix_pago",
      normalizarCampanha(p.metadata.utm_campaign),
      normalizarVariante(p.metadata.variante),
    );
  }
  // Reenvio do webhook gera o mesmo event_id; a Meta deduplica. Quem recusou no aviso de cookies não é medido.
  if (p.metadata.medir !== "nao") {
    s.depois(
      s.meta.enviar({
        event_name: "Purchase",
        event_id: `compra-${p.id}`,
        event_time: Math.floor(aprovado.getTime() / 1000),
        event_source_url: urlDoSite(s, "/r"),
        action_source: "website",
        user_data: {
          client_user_agent: texto(p.metadata.client_user_agent),
          external_id: texto(p.metadata.external_id),
          fbp: texto(p.metadata.fbp),
          fbc: texto(p.metadata.fbc),
        },
        custom_data: customDataProduto("Purchase", p.id),
      }),
    );
  }
  return json({ ok: true });
}
