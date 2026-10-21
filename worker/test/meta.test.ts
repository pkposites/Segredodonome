import { describe, expect, it, vi } from "vitest";
import { MetaCapi, motivoMeta, type EventoMeta } from "../src/meta";

const evento = (user_data: EventoMeta["user_data"]): EventoMeta => ({
  event_name: "PageView",
  event_id: "evt-12345678",
  event_time: 1_800_000_000,
  event_source_url: "https://segredo.relatoriorda.com.br/",
  action_source: "website",
  user_data,
});

function capi(resposta: () => Response) {
  const chamadas: string[] = [];
  const fetcher = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
    chamadas.push(String(init?.body));
    return resposta();
  });
  return { meta: new MetaCapi("123", "token", "v26.0", undefined, fetcher as typeof fetch, async () => {}), chamadas };
}

describe("MetaCapi", () => {
  it("não envia evento sem nenhum dado de usuário (a Meta recusaria)", async () => {
    const { meta, chamadas } = capi(() => new Response("{}"));
    await meta.enviar(evento({}));
    await meta.enviar(evento({ fbp: "" }));
    expect(chamadas).toEqual([]);
  });

  it("envia quando há IP e navegador", async () => {
    const { meta, chamadas } = capi(() => new Response("{}"));
    await meta.enviar(evento({ client_ip_address: "1.2.3.4", client_user_agent: "Mozilla/5.0" }));
    expect(chamadas).toHaveLength(1);
    expect(JSON.parse(chamadas[0]!).data[0].user_data).toEqual({ client_ip_address: "1.2.3.4", client_user_agent: "Mozilla/5.0" });
  });

  it("registra o motivo da recusa sem tentar de novo", async () => {
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { meta, chamadas } = capi(
      () => new Response(JSON.stringify({ error: { code: 100, error_subcode: 2804050, error_user_title: "Parâmetro inválido", fbtrace_id: "Abc" } }), { status: 400 }),
    );
    await meta.enviar(evento({ client_user_agent: "Mozilla/5.0" }));
    expect(chamadas).toHaveLength(1);
    expect(aviso).toHaveBeenCalledWith("CAPI PageView recusado: HTTP 400 100 · 2804050 · Parâmetro inválido · Abc");
    aviso.mockRestore();
  });
});

describe("motivoMeta", () => {
  it("lida com corpo vazio e esconde e-mails", () => {
    expect(motivoMeta(null)).toBe("(sem detalhe)");
    expect(motivoMeta({ error: { code: 190, message: "erro para a@b.com" } })).toBe("190 · erro para [email]");
  });
});
