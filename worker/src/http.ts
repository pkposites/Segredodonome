// Respostas JSON, erros no formato do contrato e CORS restrito ao domínio do front.

export class ErroHttp extends Error {
  constructor(
    readonly status: number,
    readonly codigo: string,
    mensagem: string,
  ) {
    super(mensagem);
  }
}

export const erroGenerico404 = () => new ErroHttp(404, "nao_encontrado", "Não encontramos este pagamento.");

export function json(dados: unknown, status = 200, extras: HeadersInit = {}): Response {
  return new Response(JSON.stringify(dados), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extras },
  });
}

export function respostaErro(e: ErroHttp): Response {
  return json({ erro: e.codigo, mensagem: e.message }, e.status);
}

export async function lerJson(req: Request, limiteBytes = 16_384): Promise<unknown> {
  const tamanho = Number(req.headers.get("content-length") ?? "0");
  if (tamanho > limiteBytes) throw new ErroHttp(413, "muito_grande", "Requisição grande demais.");
  const texto = await req.text();
  if (texto.length > limiteBytes) throw new ErroHttp(413, "muito_grande", "Requisição grande demais.");
  try {
    return JSON.parse(texto);
  } catch {
    throw new ErroHttp(400, "json_invalido", "Não conseguimos ler os dados enviados.");
  }
}

export function origemPermitida(req: Request, publicBaseUrl: string): string | null {
  const origem = req.headers.get("origin");
  if (!origem) return null;
  try {
    return new URL(publicBaseUrl).origin === origem ? origem : null;
  } catch {
    return null;
  }
}

export function comCors(resp: Response, origem: string | null): Response {
  if (!origem) return resp;
  const r = new Response(resp.body, resp);
  r.headers.set("access-control-allow-origin", origem);
  r.headers.set("vary", "origin");
  return r;
}

export function preflight(origem: string | null): Response {
  if (!origem) return new Response(null, { status: 403 });
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": origem,
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type",
      "access-control-max-age": "86400",
      vary: "origin",
    },
  });
}
