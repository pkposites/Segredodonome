// Cliente do Mercado Pago (API Payments, /v1/payments). Escolha e campos registrados em
// docs/FASE_0_AUDITORIA.md; conferir na documentação vigente antes do modo de produção.
import { hmacSha256, iguaisTempoConstante, paraHex } from "./cripto/hmac";
import { centavos, PRODUTO_NOME } from "./catalogo";

export const API_MERCADO_PAGO = "https://api.mercadopago.com";

export interface Pagamento {
  id: string;
  status: string;
  status_detail: string | null;
  valor: number;
  valor_reembolsado: number;
  moeda: string;
  external_reference: string | null;
  criado_em: string;
  aprovado_em: string | null;
  expira_em: string | null;
  metadata: Record<string, unknown>;
  pix: { qr_code: string | null; qr_code_base64: string | null; ticket_url: string | null };
}

export interface NovoPix {
  email: string;
  externalReference: string;
  descricao: string;
  metadata: Record<string, string>;
  idempotencyKey: string;
  expiraEm: Date;
  notificationUrl: string;
}

export interface MercadoPago {
  criarPix(p: NovoPix): Promise<Pagamento>;
  obter(id: string): Promise<Pagamento | null>;
  /** Pagamentos aprovados com esta external_reference, mais recentes primeiro. */
  buscarAprovadosPorReferencia(ref: string, diasAtras: number): Promise<Pagamento[]>;
  /** Pagamentos aprovados no período (para conferência do painel). */
  buscarAprovadosNoPeriodo(de: Date, ate: Date): Promise<Pagamento[]>;
}

export class ErroMercadoPago extends Error {
  constructor(readonly status: number) {
    super(`Mercado Pago respondeu ${status}`);
  }
}

type Bruto = Record<string, any>;

export function normalizarPagamento(b: Bruto): Pagamento {
  const td = b.point_of_interaction?.transaction_data ?? {};
  return {
    id: String(b.id),
    status: String(b.status ?? ""),
    status_detail: b.status_detail ?? null,
    valor: Number(b.transaction_amount ?? 0),
    valor_reembolsado: Number(b.transaction_amount_refunded ?? 0),
    moeda: String(b.currency_id ?? ""),
    external_reference: b.external_reference ?? null,
    criado_em: String(b.date_created ?? ""),
    aprovado_em: b.date_approved ?? null,
    expira_em: b.date_of_expiration ?? null,
    metadata: b.metadata ?? {},
    pix: { qr_code: td.qr_code ?? null, qr_code_base64: td.qr_code_base64 ?? null, ticket_url: td.ticket_url ?? null },
  };
}

/** Formato aceito em date_of_expiration: yyyy-MM-dd'T'HH:mm:ss.SSSZ com fuso (usamos -03:00). */
export function formatarDataMP(d: Date): string {
  const sp = new Date(d.getTime() - 3 * 3600_000);
  return sp.toISOString().replace("Z", "-03:00");
}

export class MercadoPagoApi implements MercadoPago {
  constructor(
    private readonly token: string,
    // fetch nunca pode ser chamado como método de outro objeto no Workers ("Illegal invocation").
    private readonly fetcher: typeof fetch = (input, init) => fetch(input, init),
    private readonly base: string = API_MERCADO_PAGO,
  ) {}

  private async chamar(caminho: string, init: RequestInit = {}): Promise<Bruto | null> {
    const resp = await this.fetcher(`${this.base}${caminho}`, {
      ...init,
      headers: { authorization: `Bearer ${this.token}`, "content-type": "application/json", ...(init.headers ?? {}) },
    });
    if (resp.status === 404) return null;
    if (!resp.ok) throw new ErroMercadoPago(resp.status);
    return (await resp.json()) as Bruto;
  }

  async criarPix(p: NovoPix): Promise<Pagamento> {
    const corpo = {
      transaction_amount: PRODUTO_NOME.precoCentavos / 100,
      description: p.descricao,
      payment_method_id: "pix",
      payer: { email: p.email },
      external_reference: p.externalReference,
      metadata: p.metadata,
      date_of_expiration: formatarDataMP(p.expiraEm),
      notification_url: p.notificationUrl,
    };
    const b = await this.chamar("/v1/payments", {
      method: "POST",
      headers: { "x-idempotency-key": p.idempotencyKey },
      body: JSON.stringify(corpo),
    });
    if (!b) throw new ErroMercadoPago(404);
    return normalizarPagamento(b);
  }

  async obter(id: string): Promise<Pagamento | null> {
    if (!/^\d{1,20}$/.test(id)) return null;
    const b = await this.chamar(`/v1/payments/${id}`);
    return b ? normalizarPagamento(b) : null;
  }

  private async buscar(params: Record<string, string>, maximo = 1000): Promise<Pagamento[]> {
    const saida: Pagamento[] = [];
    for (let offset = 0; offset < maximo; offset += 50) {
      const qs = new URLSearchParams({ ...params, limit: "50", offset: String(offset) });
      const b = await this.chamar(`/v1/payments/search?${qs}`);
      const lista: Bruto[] = b?.results ?? [];
      saida.push(...lista.map(normalizarPagamento));
      if (lista.length < 50) break;
    }
    return saida;
  }

  buscarAprovadosPorReferencia(ref: string, diasAtras: number): Promise<Pagamento[]> {
    return this.buscar(
      {
        external_reference: ref,
        status: "approved",
        sort: "date_created",
        criteria: "desc",
        range: "date_created",
        begin_date: `NOW-${diasAtras}DAYS`,
        end_date: "NOW",
      },
      100,
    );
  }

  buscarAprovadosNoPeriodo(de: Date, ate: Date): Promise<Pagamento[]> {
    return this.buscar({
      status: "approved",
      sort: "date_created",
      criteria: "asc",
      range: "date_created",
      begin_date: formatarDataMP(de),
      end_date: formatarDataMP(ate),
    });
  }
}

/** Pagamento libera o pago? Aprovado, valor e moeda do catálogo, referência certa, sem reembolso. */
export function pagamentoLibera(p: Pagamento, referenciaEsperada: string): boolean {
  return (
    p.status === "approved" &&
    centavos(p.valor) === PRODUTO_NOME.precoCentavos &&
    p.moeda === PRODUTO_NOME.moeda &&
    p.external_reference === referenciaEsperada &&
    p.valor_reembolsado === 0
  );
}

export type StatusPublico =
  | "pending"
  | "approved"
  | "expired"
  | "cancelled"
  | "rejected"
  | "refunded"
  | "charged_back";

/** Traduz o status do Mercado Pago para o contrato de POST /pagamento/status. */
export function statusPublico(p: Pagamento, agora: Date): StatusPublico {
  switch (p.status) {
    case "approved":
      return p.valor_reembolsado > 0 ? "refunded" : "approved";
    case "pending":
    case "in_process":
    case "authorized":
      return p.expira_em && Date.parse(p.expira_em) <= agora.getTime() ? "expired" : "pending";
    case "cancelled":
      return p.status_detail === "expired" ? "expired" : "cancelled";
    case "rejected":
      return "rejected";
    case "refunded":
      return "refunded";
    case "charged_back":
    case "in_mediation":
      return "charged_back";
    default:
      return "cancelled";
  }
}

/**
 * Assinatura do webhook: x-signature = "ts=...,v1=...". Manifesto
 * "id:{data.id};request-id:{x-request-id};ts:{ts};", omitindo as partes ausentes;
 * data.id alfanumérico vai em minúsculas. HMAC-SHA256 em hex com o segredo do webhook.
 */
export async function assinaturaWebhookValida(
  segredo: string,
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string | null,
): Promise<boolean> {
  if (!xSignature || !segredo) return false;
  const partes = Object.fromEntries(
    xSignature.split(",").map((p) => {
      const [k, ...v] = p.trim().split("=");
      return [k, v.join("=")];
    }),
  );
  const ts = partes.ts;
  const v1 = partes.v1;
  if (!ts || !v1) return false;
  let manifesto = "";
  if (dataId) manifesto += `id:${/^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId};`;
  if (xRequestId) manifesto += `request-id:${xRequestId};`;
  manifesto += `ts:${ts};`;
  const esperado = paraHex(await hmacSha256(segredo, manifesto));
  return iguaisTempoConstante(esperado, v1.toLowerCase());
}
