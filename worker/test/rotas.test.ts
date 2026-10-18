import { describe, expect, it, vi } from "vitest";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { ambiente, ENTRADAS, ORIGEM } from "./dubles";
import { hmacSha256, paraHex } from "../src/cripto/hmac";
import { emitirPasse } from "../src/cripto/passe";
import { LIMITE_RECUPERAR_POR_HORA } from "../src/rotas/pagamento";

const EMAIL = "pessoa.compradora@exemplo.com";
const UUID = "6f1c2c1e-6c43-4c3a-9a55-2f0f6a0d9e11";

async function comprar(a: ReturnType<typeof ambiente>, entradas = ENTRADAS) {
  const c = await a.chamar("/checkout", { entradas, email: EMAIL, idempotency_key: crypto.randomUUID(), cookies_aceitos: true, fbp: "fb.1.1.1" });
  a.mp.aprovar(c.corpo.pagamento_id);
  const st = await a.chamar("/pagamento/status", { pagamento_id: c.corpo.pagamento_id, entradas });
  return { pagamentoId: c.corpo.pagamento_id as string, passe: st.corpo.passe as string, status: st };
}

async function webhook(a: ReturnType<typeof ambiente>, id: string, segredo = "segredo-webhook") {
  const ts = "1760800000";
  const v1 = paraHex(await hmacSha256(segredo, `id:${id};request-id:req-9;ts:${ts};`));
  return a.chamar(`/webhook/mercadopago?data.id=${id}&type=payment`, { type: "payment", data: { id } }, {
    headers: { "x-signature": `ts=${ts},v1=${v1}`, "x-request-id": "req-9", origin: "" },
  });
}

describe("POST /resultado", () => {
  it("devolve o grátis completo e a oferta, sem o texto pago", async () => {
    const a = ambiente();
    const r = await a.chamar("/resultado", { entradas: ENTRADAS });
    expect(r.status).toBe(200);
    expect(r.headers.get("access-control-allow-origin")).toBe(ORIGEM);
    expect(r.corpo.gratis.arquetipo.nome).toBe("O Farol");
    expect(r.corpo.completo).toBeNull();
    expect(r.corpo.oferta.preco).toBe(11.9);
    expect(r.corpo.versoes).toEqual({ algoritmo: "1.0.0", conteudo: "2026-10-a" });
    // O texto pago além da primeira frase não sai do Worker antes do pagamento.
    const pago = await comprar(ambiente());
    for (const s of pago.status.corpo.completo.secoes) {
      const resto = (s.paragrafos[1] ?? s.trimestres?.[1]?.texto) as string;
      expect(r.texto).not.toContain(resto);
    }
  });

  it("menor de 18 anos: nada é processado", async () => {
    const a = ambiente();
    const r = await a.chamar("/resultado", { entradas: { ...ENTRADAS, data_nascimento: "2010-01-01" } });
    expect(r.status).toBe(403);
    expect(r.corpo.erro).toBe("idade");
    expect(r.texto).not.toContain("Camila");
  });

  it("valida o formato e não ecoa o que foi enviado", async () => {
    const a = ambiente();
    for (const entradas of [
      { ...ENTRADAS, respostas: [1, 2, 3] },
      { ...ENTRADAS, respostas: [0, 0, 0, 0, 4] },
      { ...ENTRADAS, data_nascimento: "1994-02-30" },
      { ...ENTRADAS, nome: "1" },
      { ...ENTRADAS, tratamento: "x" },
    ]) {
      const r = await a.chamar("/resultado", { entradas });
      expect(r.status).toBe(400);
      expect(r.texto).not.toContain("Camila");
    }
  });

  it("CORS: sem origem do site é recusado; preflight só para o domínio", async () => {
    const a = ambiente();
    expect((await a.chamar("/resultado", { entradas: ENTRADAS }, { headers: { origin: "https://outro.site" } })).status).toBe(403);
    const pre = await a.chamar("/resultado", undefined, { method: "OPTIONS" });
    expect(pre.status).toBe(204);
    expect(pre.headers.get("access-control-allow-origin")).toBe(ORIGEM);
  });
});

describe("compra completa", () => {
  it("checkout → pendente → aprovado com passe, comprovante e completo", async () => {
    const a = ambiente();
    const c = await a.chamar("/checkout", { entradas: ENTRADAS, email: EMAIL, idempotency_key: UUID, cookies_aceitos: true, fbp: "fb.1.1.1", utm_campaign: "120210" });
    expect(c.status).toBe(201);
    expect(c.corpo).toMatchObject({ copia_e_cola: expect.any(String), qr_code_base64: expect.any(String), event_id_checkout: expect.any(String) });
    expect(a.mp.criados[0]!.externalReference).toMatch(/^sdn1-[0-9a-f]{32}$/);
    expect(a.mp.criados[0]!.notificationUrl).toBe("https://api.segredo.exemplo/webhook/mercadopago");
    expect(a.meta.eventos.map((e) => e.event_name)).toEqual(["InitiateCheckout"]);
    expect(a.meta.eventos[0]!.event_id).toBe(c.corpo.event_id_checkout);
    expect(a.banco.total("pix_gerado")).toBe(1);

    const pend = await a.chamar("/pagamento/status", { pagamento_id: c.corpo.pagamento_id, entradas: ENTRADAS });
    expect(pend.corpo).toEqual({ status: "pending" });

    a.mp.aprovar(c.corpo.pagamento_id);
    const ok = await a.chamar("/pagamento/status", { pagamento_id: c.corpo.pagamento_id, entradas: ENTRADAS });
    expect(ok.corpo.status).toBe("approved");
    expect(ok.corpo.event_id_purchase).toBe(`compra-${c.corpo.pagamento_id}`);
    expect(ok.corpo.comprovante).toMatchObject({ pagamento_id: c.corpo.pagamento_id, valor: 11.9, forma: "Pix" });
    expect(ok.corpo.completo.secoes).toHaveLength(7);
    expect(ok.corpo.passe).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("o e-mail do checkout não vai para banco, Meta, metadados nem log", async () => {
    const a = ambiente();
    const logs: string[] = [];
    const espiões = (["log", "warn", "error", "info"] as const).map((m) =>
      vi.spyOn(console, m).mockImplementation((...args) => void logs.push(args.map(String).join(" "))),
    );
    await comprar(a);
    await webhook(a, a.mp.criados.length ? [...a.mp.pagamentos.keys()][0]! : "");
    espiões.forEach((e) => e.mockRestore());
    const tudo = JSON.stringify({ banco: a.banco, meta: a.meta.eventos, metadata: [...a.mp.pagamentos.values()].map((p) => p.metadata), logs });
    expect(tudo).not.toContain(EMAIL);
    expect(tudo).not.toContain("Camila");
    expect(tudo).not.toContain("1994-03-17");
    // Só o Mercado Pago recebe o e-mail
    expect(a.mp.criados[0]!.email).toBe(EMAIL);
  });

  it("mesma idempotency_key duas vezes → um único pagamento", async () => {
    const a = ambiente();
    const corpo = { entradas: ENTRADAS, email: EMAIL, idempotency_key: UUID };
    const r1 = await a.chamar("/checkout", corpo);
    const r2 = await a.chamar("/checkout", corpo);
    expect(r1.corpo.pagamento_id).toBe(r2.corpo.pagamento_id);
    expect(a.mp.criados).toHaveLength(1);
  });

  it("status com entradas de outra pessoa → 404 genérico", async () => {
    const a = ambiente();
    const { pagamentoId } = await comprar(a);
    const r = await a.chamar("/pagamento/status", { pagamento_id: pagamentoId, entradas: { ...ENTRADAS, nome: "Bruna Lima" } });
    expect(r.status).toBe(404);
    expect(r.texto).not.toContain("passe");
  });

  it("Mercado Pago fora do ar no checkout ou no status → 502 com mensagem clara", async () => {
    const a = ambiente();
    a.mp.falhar = true;
    const r = await a.chamar("/checkout", { entradas: ENTRADAS, email: EMAIL, idempotency_key: UUID });
    expect(r.status).toBe(502);
    expect(r.corpo.erro).toBe("pagamento_indisponivel");
    const st = await a.chamar("/pagamento/status", { pagamento_id: "1", entradas: ENTRADAS });
    expect(st.status).toBe(502);
  });
});

describe("abrir de novo com o passe", () => {
  it("passe válido → completo, conferido no Mercado Pago a cada abertura", async () => {
    const a = ambiente();
    const { passe } = await comprar(a);
    const r = await a.chamar("/resultado", { passe });
    expect(r.corpo.completo.secoes).toHaveLength(7);
    expect(r.corpo.oferta).toBeNull();
  });

  it("estornado → só o grátis + aviso", async () => {
    const a = ambiente();
    const { passe, pagamentoId } = await comprar(a);
    a.mp.reembolsar(pagamentoId);
    const r = await a.chamar("/resultado", { passe });
    expect(r.corpo.completo).toBeNull();
    expect(r.corpo.aviso).toBe("reembolsado");
    expect(r.corpo.gratis.arquetipo.numero).toBe(7);
  });

  it("passe de uma pessoa com entradas de outra → completo continua sendo do dono do passe", async () => {
    const a = ambiente();
    const { passe } = await comprar(a);
    const r = await a.chamar("/resultado", { passe, entradas: { ...ENTRADAS, nome: "Bruna Lima", tratamento: "ele" } });
    expect(r.corpo.gratis.primeiro_nome).toBe("Camila");
  });

  it("passe alterado → rejeitado; passe vencido → só o grátis", async () => {
    const a = ambiente();
    const { passe } = await comprar(a);
    const alterado = passe.slice(0, -2) + (passe.endsWith("AA") ? "BB" : "AA");
    expect((await a.chamar("/resultado", { passe: alterado })).status).toBe(400);

    a.relogio.agora = new Date("2027-10-19T15:00:00Z");
    const r = await a.chamar("/resultado", { passe });
    expect(r.corpo.completo).toBeNull();
    expect(r.corpo.aviso).toBe("expirado");
  });

  it("pagamento de outra chave, valor diferente ou pendente → não libera", async () => {
    const a = ambiente();
    const { passe, pagamentoId } = await comprar(a);
    const p = a.mp.pagamentos.get(pagamentoId)!;
    for (const mudar of [() => (p.external_reference = "sdn1-outra"), () => (p.valor = 1.19), () => (p.status = "pending")]) {
      const copia = { ...p };
      mudar();
      expect((await a.chamar("/resultado", { passe })).corpo.completo).toBeNull();
      Object.assign(p, copia);
    }
    // Passe forjado com outro pagamento_id que não pertence às entradas
    const forjado = await emitirPasse(
      { v: 1, nome: "Bruna Lima", data: "1990-01-01", tratamento: "ela", respostas: [0, 0, 0, 0, 0], pagamento_id: pagamentoId, content_version: "2026-10-a", emitido_em: "", expira_em: "2099-01-01T00:00:00Z" },
      a.s.chavesPasse,
    );
    expect((await a.chamar("/resultado", { passe: forjado })).corpo.completo).toBeNull();
  });

  it("Mercado Pago fora do ar → grátis + aviso, nunca libera o pago às cegas", async () => {
    const a = ambiente();
    const { passe } = await comprar(a);
    a.mp.falhar = true;
    const r = await a.chamar("/resultado", { passe });
    expect(r.corpo.completo).toBeNull();
    expect(r.corpo.aviso).toBe("verificacao_indisponivel");
  });
});

describe("POST /recuperar", () => {
  it("refazer o quiz com mesmo nome e data encontra a compra", async () => {
    const a = ambiente();
    await comprar(a);
    const r = await a.chamar("/recuperar", { entradas: { ...ENTRADAS, nome: "camila  COSTA", respostas: [1, 1, 1, 1, 1] } });
    expect(r.status).toBe(200);
    expect(r.corpo.passe).toBeTruthy();
    expect(r.corpo.gratis.temperamento.id).toBe("estrategico");
  });

  it("sem compra → 404 genérico; estornada → 404", async () => {
    const a = ambiente();
    expect((await a.chamar("/recuperar", { entradas: ENTRADAS })).status).toBe(404);
    const { pagamentoId } = await comprar(a);
    a.mp.reembolsar(pagamentoId);
    expect((await a.chamar("/recuperar", { entradas: ENTRADAS })).status).toBe(404);
  });

  it(`limite de ${LIMITE_RECUPERAR_POR_HORA} por hora por IP`, async () => {
    const a = ambiente();
    for (let i = 0; i < LIMITE_RECUPERAR_POR_HORA; i++) expect((await a.chamar("/recuperar", { entradas: ENTRADAS })).status).toBe(404);
    expect((await a.chamar("/recuperar", { entradas: ENTRADAS })).status).toBe(429);
    expect((await a.chamar("/recuperar", { entradas: ENTRADAS }, { ip: "198.51.100.1" })).status).toBe(404);
  });
});

describe("POST /webhook/mercadopago", () => {
  it("assinatura inválida → 401, sem consultar nada", async () => {
    const a = ambiente();
    const { pagamentoId } = await comprar(a);
    expect((await webhook(a, pagamentoId, "segredo-errado")).status).toBe(401);
    expect(a.meta.eventos.some((e) => e.event_name === "Purchase")).toBe(false);
  });

  it("aprovado → Purchase do servidor; repetido → mesmo event_id e conta uma vez", async () => {
    const a = ambiente();
    const { pagamentoId } = await comprar(a);
    expect((await webhook(a, pagamentoId)).status).toBe(200);
    expect((await webhook(a, pagamentoId)).status).toBe(200);
    const compras = a.meta.eventos.filter((e) => e.event_name === "Purchase");
    expect(compras).toHaveLength(2);
    expect(new Set(compras.map((e) => e.event_id))).toEqual(new Set([`compra-${pagamentoId}`]));
    expect(compras[0]!.custom_data).toMatchObject({ value: 11.9, currency: "BRL", order_id: pagamentoId, content_ids: ["nome_completo_v1"] });
    expect(compras[0]!.user_data).toEqual({ fbp: "fb.1.1.1" });
    expect(a.banco.total("pix_pago")).toBe(1);
  });

  it("pendente ou de outro produto → não envia Purchase", async () => {
    const a = ambiente();
    const c = await a.chamar("/checkout", { entradas: ENTRADAS, email: EMAIL, idempotency_key: UUID });
    await webhook(a, c.corpo.pagamento_id);
    a.mp.aprovar(c.corpo.pagamento_id);
    a.mp.pagamentos.get(c.corpo.pagamento_id)!.external_reference = "outro-sistema";
    await webhook(a, c.corpo.pagamento_id);
    expect(a.meta.eventos.some((e) => e.event_name === "Purchase")).toBe(false);
    expect(a.banco.total("pix_pago")).toBe(0);
  });
});

describe("POST /evento", () => {
  it("soma no contador e envia o evento padrão com o mesmo event_id", async () => {
    const a = ambiente();
    const r = await a.chamar("/evento", { tipo: "resultado_visto", event_id: "evt-12345678", utm_campaign: "120210", cookies_aceitos: true, fbp: "fb.1.2.3" });
    expect(r.status).toBe(204);
    expect(a.banco.total("resultado_visto")).toBe(1);
    expect(a.meta.eventos[0]).toMatchObject({
      event_name: "ViewContent",
      event_id: "evt-12345678",
      event_source_url: `${ORIGEM}/r`,
      user_data: { client_ip_address: "203.0.113.7", fbp: "fb.1.2.3" },
    });
  });

  it("sem aceite de cookies: sem IP, user agent e fbp", async () => {
    const a = ambiente();
    await a.chamar("/evento", { tipo: "visita", event_id: "evt-12345678", fbp: "fb.1.2.3" });
    expect(a.meta.eventos[0]!.user_data).toEqual({});
  });

  it("robô de pré-visualização é ignorado; etapa do servidor não pode vir do navegador", async () => {
    const a = ambiente();
    const robo = await a.chamar("/evento", { tipo: "visita", event_id: "evt-12345678" }, { headers: { "user-agent": "facebookexternalhit/1.1" } });
    expect(robo.status).toBe(204);
    expect(a.banco.total("visita")).toBe(0);
    expect((await a.chamar("/evento", { tipo: "pix_pago", event_id: "evt-12345678" })).status).toBe(400);
  });
});

describe("registro de acesso (Marco Civil)", () => {
  it("guarda só IP, data/hora, método, rota sem query string e status", async () => {
    const a = ambiente();
    await a.chamar("/resultado?nome=Camila", { entradas: ENTRADAS });
    expect(a.banco.acessos).toEqual([
      { ip: "203.0.113.7", metodo: "POST", rota: "/resultado", status: 200, quando: "2026-10-18T15:00:00.000Z" },
    ]);
  });
});

describe("/admin e /painel", () => {
  async function comAccess(a: ReturnType<typeof ambiente>) {
    const { publicKey, privateKey } = await generateKeyPair("RS256");
    const jwk = { ...(await exportJWK(publicKey)), kid: "k1", alg: "RS256" };
    a.s.access.chaves = createLocalJWKSet({ keys: [jwk] });
    return (email: string, aud = "aud-teste") =>
      new SignJWT({ email })
        .setProtectedHeader({ alg: "RS256", kid: "k1" })
        .setIssuer("https://equipe.cloudflareaccess.com")
        .setAudience(aud)
        .setIssuedAt()
        .setExpirationTime("1h")
        .sign(privateKey);
  }

  it("sem JWT, com e-mail fora da lista ou AUD errado → 403", async () => {
    const a = ambiente();
    const token = await comAccess(a);
    expect((await a.chamar("/painel", undefined, { method: "GET" })).status).toBe(403);
    for (const t of [await token("intruso@exemplo.com"), await token("rob@exemplo.com", "outro-aud")]) {
      expect((await a.chamar("/admin/config", undefined, { method: "GET", headers: { "cf-access-jwt-assertion": t } })).status).toBe(403);
    }
  });

  it("painel: funil, custo por etapa, receita e lucro conferidos à mão", async () => {
    const a = ambiente();
    const token = await comAccess(a);
    const h = { "cf-access-jwt-assertion": await token("ROB@exemplo.com") };
    for (let i = 0; i < 100; i++) await a.banco.incrementar("2026-10-18", "visita", "(sem)");
    for (let i = 0; i < 40; i++) await a.banco.incrementar("2026-10-18", "quiz_inicio", "(sem)");
    for (let i = 0; i < 4; i++) await a.banco.incrementar("2026-10-18", "pix_pago", "(sem)");
    expect((await a.chamar("/admin/gasto", { dia: "2026-10-18", gasto_cents: 2000 }, { method: "PUT", headers: h })).status).toBe(200);
    expect((await a.chamar("/admin/config", { taxa_pix_pct: 1, imposto_pct: 6 }, { method: "PUT", headers: h })).status).toBe(200);

    const r = await a.chamar("/admin/painel?de=2026-10-18&ate=2026-10-18", undefined, { method: "GET", headers: h });
    expect(r.status).toBe(200);
    const p = r.corpo;
    expect(p.gasto_cents).toBe(2000);
    expect(p.funil[0]).toMatchObject({ etapa: "visita", total: 100, custo_cents: 20 });
    expect(p.funil[1]).toMatchObject({ etapa: "quiz_inicio", total: 40, pct_anterior: 0.4, custo_cents: 50 });
    expect(p.vendas).toBe(4);
    expect(p.receita_bruta_cents).toBe(4760);
    expect(p.taxa_cents).toBe(48); // 1% de 47,60
    expect(p.imposto_cents).toBe(286); // 6% de 47,60
    expect(p.lucro_cents).toBe(4760 - 48 - 286 - 2000);
    expect(p.custo_por_venda_cents).toBe(500);
    expect(p.dados_insuficientes).toBe(true);

    const html = await a.chamar("/painel", undefined, { method: "GET", headers: h });
    expect(html.status).toBe(200);
    expect(html.headers.get("content-type")).toContain("text/html");
    expect(html.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
  });
});
