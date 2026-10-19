// Chamadas ao Worker. Erros chegam como { erro, mensagem } em português.
import { CONFIG } from "./config.js";

export class ErroApi extends Error {
  constructor(status, codigo, mensagem) {
    super(mensagem || "Algo deu errado. Tente de novo.");
    this.status = status;
    this.codigo = codigo;
  }
}

export async function post(caminho, corpo, { keepalive = false } = {}) {
  let resp;
  try {
    resp = await fetch(CONFIG.API_BASE_URL + caminho, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(corpo),
      keepalive,
      credentials: "omit",
    });
  } catch {
    throw new ErroApi(0, "rede", "Sem conexão. Confira a internet e tente de novo.");
  }
  if (resp.status === 204) return null;
  const dados = await resp.json().catch(() => null);
  if (!resp.ok) throw new ErroApi(resp.status, dados?.erro ?? "erro", dados?.mensagem);
  return dados;
}
