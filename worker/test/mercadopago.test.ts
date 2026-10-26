import { describe, expect, it } from "vitest";
import {
  assinaturaWebhookValida,
  formatarDataMP,
  MercadoPagoApi,
  normalizarPagamento,
  pagamentoLibera,
  statusPublico,
  type Pagamento,
} from "../src/mercadopago";
import { hmacSha256, paraHex } from "../src/cripto/hmac";

const base: Pagamento = normalizarPagamento({
  id: 123,
  status: "approved",
  transaction_amount: 11.9,
  currency_id: "BRL",
  external_reference: "sdn1-abc",
  date_created: "2026-10-18T12:00:00.000-03:00",
  date_approved: "2026-10-18T12:05:00.000-03:00",
});

describe("pagamentoLibera", () => {
  it("só libera aprovado, 17,90 ou os preços anteriores (13,90 e 11,90) em BRL, referência certa e sem reembolso", () => {
    expect(pagamentoLibera(base, "sdn1-abc")).toBe(true);
    expect(pagamentoLibera({ ...base, valor: 13.9 }, "sdn1-abc")).toBe(true);
    expect(pagamentoLibera({ ...base, valor: 17.9 }, "sdn1-abc")).toBe(true);
    expect(pagamentoLibera({ ...base, valor: 15.9 }, "sdn1-abc")).toBe(false);
    expect(pagamentoLibera({ ...base, valor: 12.9 }, "sdn1-abc")).toBe(false);
    expect(pagamentoLibera(base, "sdn1-outra")).toBe(false);
    expect(pagamentoLibera({ ...base, valor: 1.19 }, "sdn1-abc")).toBe(false);
    expect(pagamentoLibera({ ...base, moeda: "USD" }, "sdn1-abc")).toBe(false);
    expect(pagamentoLibera({ ...base, status: "pending" }, "sdn1-abc")).toBe(false);
    expect(pagamentoLibera({ ...base, status: "refunded" }, "sdn1-abc")).toBe(false);
    expect(pagamentoLibera({ ...base, valor_reembolsado: 11.9 }, "sdn1-abc")).toBe(false);
  });
});

describe("statusPublico", () => {
  const agora = new Date("2026-10-18T16:00:00Z");
  it("mapeia os estados do Mercado Pago", () => {
    expect(statusPublico(base, agora)).toBe("approved");
    expect(statusPublico({ ...base, status: "pending", expira_em: "2026-10-18T17:00:00Z" }, agora)).toBe("pending");
    expect(statusPublico({ ...base, status: "pending", expira_em: "2026-10-18T15:00:00Z" }, agora)).toBe("expired");
    expect(statusPublico({ ...base, status: "cancelled", status_detail: "expired" }, agora)).toBe("expired");
    expect(statusPublico({ ...base, status: "cancelled", status_detail: "by_collector" }, agora)).toBe("cancelled");
    expect(statusPublico({ ...base, status: "rejected" }, agora)).toBe("rejected");
    expect(statusPublico({ ...base, status: "refunded" }, agora)).toBe("refunded");
    expect(statusPublico({ ...base, status: "charged_back" }, agora)).toBe("charged_back");
    expect(statusPublico({ ...base, status: "in_mediation" }, agora)).toBe("charged_back");
    expect(statusPublico({ ...base, valor_reembolsado: 5 }, agora)).toBe("refunded");
  });
});

describe("assinatura do webhook", () => {
  async function assinar(manifesto: string) {
    return paraHex(await hmacSha256("segredo", manifesto));
  }

  it("aceita assinatura correta e rejeita alterada", async () => {
    const v1 = await assinar("id:123;request-id:req-1;ts:1704908010;");
    expect(await assinaturaWebhookValida("segredo", `ts=1704908010,v1=${v1}`, "req-1", "123")).toBe(true);
    expect(await assinaturaWebhookValida("segredo", `ts=1704908011,v1=${v1}`, "req-1", "123")).toBe(false);
    expect(await assinaturaWebhookValida("segredo", `ts=1704908010,v1=${v1}`, "req-2", "123")).toBe(false);
    expect(await assinaturaWebhookValida("segredo", `ts=1704908010,v1=${v1}`, "req-1", "124")).toBe(false);
    expect(await assinaturaWebhookValida("outro", `ts=1704908010,v1=${v1}`, "req-1", "123")).toBe(false);
    expect(await assinaturaWebhookValida("segredo", null, "req-1", "123")).toBe(false);
    expect(await assinaturaWebhookValida("segredo", "lixo", "req-1", "123")).toBe(false);
  });

  it("data.id alfanumérico vai em minúsculas; partes ausentes saem do manifesto", async () => {
    const v1 = await assinar("id:abc123;ts:99;");
    expect(await assinaturaWebhookValida("segredo", `ts=99,v1=${v1}`, null, "ABC123")).toBe(true);
  });
});

describe("cliente HTTP", () => {
  it("cria Pix com idempotência, valor do catálogo e sem nome/data no corpo", async () => {
    const chamadas: { url: string; init: RequestInit }[] = [];
    const fetcher = (async (url: string, init: RequestInit) => {
      chamadas.push({ url, init });
      return new Response(
        JSON.stringify({
          id: 42,
          status: "pending",
          transaction_amount: 11.9,
          currency_id: "BRL",
          external_reference: "sdn1-x",
          date_created: "2026-10-18T12:00:00.000-03:00",
          date_of_expiration: "2026-10-18T12:30:00.000-03:00",
          point_of_interaction: { transaction_data: { qr_code: "000201", qr_code_base64: "AAA", ticket_url: "https://t" } },
        }),
        { status: 201 },
      );
    }) as unknown as typeof fetch;
    const mp = new MercadoPagoApi("TEST-1", fetcher);
    const p = await mp.criarPix({
      email: "a@b.com",
      externalReference: "sdn1-x",
      descricao: "Segredo do Nome - resultado completo",
      metadata: { event_id: "e1" },
      idempotencyKey: "11111111-1111-4111-8111-111111111111",
      expiraEm: new Date("2026-10-18T15:30:00Z"),
      notificationUrl: "https://api.x/webhook/mercadopago",
    });
    expect(p.pix.qr_code).toBe("000201");
    const { url, init } = chamadas[0]!;
    expect(url).toBe("https://api.mercadopago.com/v1/payments");
    const h = init.headers as Record<string, string>;
    expect(h["x-idempotency-key"]).toBe("11111111-1111-4111-8111-111111111111");
    expect(h.authorization).toBe("Bearer TEST-1");
    const corpo = JSON.parse(String(init.body));
    expect(corpo).toMatchObject({ transaction_amount: 17.9, payment_method_id: "pix", payer: { email: "a@b.com" } });
    expect(corpo.date_of_expiration).toBe("2026-10-18T12:30:00.000-03:00");
  });

  it("formatarDataMP usa o fuso -03:00", () => {
    expect(formatarDataMP(new Date("2026-01-01T03:00:00Z"))).toBe("2026-01-01T00:00:00.000-03:00");
  });

  it("obter recusa ID que não é numérico sem chamar a API", async () => {
    let chamou = false;
    const mp = new MercadoPagoApi("t", (async () => {
      chamou = true;
      return new Response("{}");
    }) as unknown as typeof fetch);
    expect(await mp.obter("../v1/x")).toBeNull();
    expect(chamou).toBe(false);
  });
});

describe("motivo da recusa no log", () => {
  it("junta códigos e mensagem do Mercado Pago e apaga e-mails", async () => {
    const { motivoMP } = await import("../src/mercadopago");
    const m = motivoMP({ error: "bad_request", message: "payer fulana@exemplo.com invalid", cause: [{ code: 13253, description: "Collector without key" }] });
    expect(m).toContain("13253 Collector without key");
    expect(m).toContain("[e-mail]");
    expect(m).not.toContain("fulana@exemplo.com");
    expect(motivoMP(null)).toBe("");
  });
});
