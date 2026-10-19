// Chamadas ao Worker. Erros chegam como { erro, mensagem } em português.
import { CONFIG } from "./config.js";

export class ErroApi extends Error {
  constructor(status, codigo, mensagem) {
    super(mensagem || "Algo deu errado. Tente de novo.");
    this.status = status;
    this.codigo = codigo;
  }
}

// Modo demonstração: só existe na prévia (o arquivo js/demo-api.js não vai para produção).
// Liga com ?demo=1 e desliga com ?demo=0; fica lembrado neste aparelho.
const parametro = new URLSearchParams(location.search).get("demo");
try {
  // Link de acesso gerado na demonstração ({"demo":1,...} em base64url). Passe real começa com o byte de versão.
  if (parametro === "1" || location.hash.startsWith("#p=eyJkZW1vIjox")) localStorage.setItem("sdn_demo", "1");
  if (parametro === "0") localStorage.removeItem("sdn_demo");
} catch {}
export const MODO_DEMO = (() => {
  if (CONFIG.DOMINIOS_OFICIAIS.includes(location.hostname)) return false;
  try {
    return localStorage.getItem("sdn_demo") === "1";
  } catch {
    return false;
  }
})();

export async function post(caminho, corpo, { keepalive = false } = {}) {
  if (MODO_DEMO) {
    const demo = await import("./demo-api.js").catch(() => null);
    if (!demo) throw new ErroApi(0, "demo", "O modo demonstração não está disponível neste site.");
    try {
      return await demo.post(caminho, JSON.parse(JSON.stringify(corpo)));
    } catch (e) {
      throw new ErroApi(e.status ?? 500, e.codigo ?? "erro", e.message);
    }
  }
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
