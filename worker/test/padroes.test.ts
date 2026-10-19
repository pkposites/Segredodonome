import { describe, expect, it } from "vitest";
import worker from "../src/index";
import type { Env } from "../src/env";
import { completarEnv, PADROES } from "../src/padroes";
import { BancoNulo } from "../src/banco";

const so = (extra: Partial<Env>) => extra as Env;

describe("configuração mínima", () => {
  it("sem variáveis no painel, valem os padrões de produção", () => {
    const e = completarEnv(so({ SEGREDO: "x" }));
    expect(e.AMBIENTE).toBe("production");
    expect(e.PUBLIC_BASE_URL).toBe(PADROES.PUBLIC_BASE_URL);
    expect(e.META_PIXEL_ID).toBe(PADROES.META_PIXEL_ID);
    expect(e.PIX_VALIDADE_MINUTOS).toBe("30");
  });

  it("variável cadastrada (não vazia) vence o padrão", () => {
    const e = completarEnv(so({ PUBLIC_BASE_URL: "http://localhost:8788", AMBIENTE: "dev", META_PIXEL_ID: "" }));
    expect(e.PUBLIC_BASE_URL).toBe("http://localhost:8788");
    expect(e.AMBIENTE).toBe("dev");
    expect(e.META_PIXEL_ID).toBe(PADROES.META_PIXEL_ID);
  });

  it("um segredo só gera três chaves diferentes; chaves cadastradas não são trocadas", () => {
    const e = completarEnv(so({ SEGREDO: "abc" }));
    expect(new Set([e.SEGREDO_CHAVE, e.SEGREDO_PASSE, e.SEGREDO_SEMENTE]).size).toBe(3);
    expect(completarEnv(so({ SEGREDO: "abc" })).SEGREDO_PASSE).toBe(e.SEGREDO_PASSE);
    expect(completarEnv(so({ SEGREDO: "abc", SEGREDO_PASSE: "antiga" })).SEGREDO_PASSE).toBe("antiga");
  });

  it("sem banco ligado, o Worker responde normalmente", async () => {
    const ctx = { waitUntil() {}, passThroughOnException() {} } as unknown as ExecutionContext;
    const r = await worker.fetch(new Request("https://w.exemplo/teste"), so({ SEGREDO: "abc" }), ctx);
    expect(r.status).toBe(404);
    expect(await r.json()).toMatchObject({ erro: "nao_encontrado" });
  });

  it("banco nulo: nada contado, painel zerado", async () => {
    const b = new BancoNulo();
    await b.incrementar();
    expect((await b.contadores()).visita).toBe(0);
    expect(await b.marcarPagamentoContado()).toBe(true);
    expect(await b.contarAcessos()).toBeGreaterThan(1000); // recuperação bloqueada, não liberada
  });
});
