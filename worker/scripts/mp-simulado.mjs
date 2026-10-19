// SIMULADOR LOCAL do Mercado Pago, só para desenvolvimento e testes no navegador sem
// credenciais. Imita as rotas que o Worker usa. NÃO substitui o teste com as credenciais
// de teste oficiais (Fase 2). Uso:
//   node scripts/mp-simulado.mjs            (porta 8790)
//   no .dev.vars: MP_API_BASE=http://localhost:8790
//   aprovar:   curl -X POST http://localhost:8790/simular/aprovar/<id>
//   estornar:  curl -X POST http://localhost:8790/simular/estornar/<id>
//   expirar:   curl -X POST http://localhost:8790/simular/expirar/<id>
import { createServer } from "node:http";

const PORTA = Number(process.env.PORTA ?? 8790);
const pagamentos = new Map();
const porChave = new Map();
let proximo = 900000001;

const json = (res, status, dados) => {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(dados));
};

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORTA}`);
  let corpo = "";
  for await (const c of req) corpo += c;

  if (req.method === "POST" && url.pathname === "/v1/payments") {
    const b = JSON.parse(corpo || "{}");
    const chave = req.headers["x-idempotency-key"];
    if (!chave) return json(res, 400, { message: "X-Idempotency-Key obrigatório" });
    if (porChave.has(chave)) return json(res, 201, pagamentos.get(porChave.get(chave)));
    if (!b.payer?.email) return json(res, 400, { message: "payer.email obrigatório" });
    const id = proximo++;
    const p = {
      id,
      status: "pending",
      status_detail: "pending_waiting_transfer",
      transaction_amount: b.transaction_amount,
      transaction_amount_refunded: 0,
      currency_id: "BRL",
      external_reference: b.external_reference,
      metadata: b.metadata ?? {},
      date_created: new Date().toISOString(),
      date_approved: null,
      date_of_expiration: b.date_of_expiration,
      point_of_interaction: {
        transaction_data: {
          qr_code: `00020126580014br.gov.bcb.pix0136simulado-${id}5204000053039865406${b.transaction_amount}5802BR`,
          // PNG 1×1 cinza: o simulador não desenha um QR de verdade
          qr_code_base64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVR4nGNgAAAAAgABc3UBGAAAAABJRU5ErkJggg==",
          ticket_url: null,
        },
      },
    };
    pagamentos.set(String(id), p);
    porChave.set(chave, String(id));
    console.log(`Pix criado ${id} (${b.external_reference}). Aprovar: curl -X POST http://localhost:${PORTA}/simular/aprovar/${id}`);
    return json(res, 201, p);
  }

  const um = url.pathname.match(/^\/v1\/payments\/(\d+)$/);
  if (req.method === "GET" && um) {
    const p = pagamentos.get(um[1]);
    return p ? json(res, 200, p) : json(res, 404, { message: "not found" });
  }

  if (req.method === "GET" && url.pathname === "/v1/payments/search") {
    const ref = url.searchParams.get("external_reference");
    const status = url.searchParams.get("status");
    const results = [...pagamentos.values()]
      .filter((p) => (!ref || p.external_reference === ref) && (!status || p.status === status))
      .reverse();
    return json(res, 200, { results, paging: { total: results.length } });
  }

  const sim = url.pathname.match(/^\/simular\/(aprovar|estornar|expirar)\/(\d+)$/);
  if (req.method === "POST" && sim) {
    const p = pagamentos.get(sim[2]);
    if (!p) return json(res, 404, {});
    if (sim[1] === "aprovar") Object.assign(p, { status: "approved", status_detail: "accredited", date_approved: new Date().toISOString() });
    if (sim[1] === "estornar") Object.assign(p, { status: "refunded", status_detail: "refunded", transaction_amount_refunded: p.transaction_amount });
    if (sim[1] === "expirar") Object.assign(p, { status: "cancelled", status_detail: "expired" });
    console.log(`${sim[1]}: ${p.id} → ${p.status}`);
    return json(res, 200, p);
  }

  json(res, 404, { message: "rota não simulada" });
}).listen(PORTA, () => console.log(`Mercado Pago SIMULADO em http://localhost:${PORTA}`));
