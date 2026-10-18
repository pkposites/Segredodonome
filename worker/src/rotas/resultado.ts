// POST /resultado (worker/API.md).
import { abrirPasse, passeVencido } from "../cripto/passe";
import { ErroHttp, json, lerJson } from "../http";
import { pagamentoLibera } from "../mercadopago";
import type { Servicos } from "../servicos";
import { entradasDoPasse, exigirEntradas, montarResposta, referenciaDe } from "./comum";

export async function postResultado(req: Request, s: Servicos): Promise<Response> {
  const corpo = (await lerJson(req)) as { entradas?: unknown; passe?: unknown };

  if (typeof corpo?.passe === "string" && corpo.passe.length > 0) {
    const c = await abrirPasse(corpo.passe, s.chavesPasse);
    if (!c) throw new ErroHttp(400, "passe_invalido", "Este link de acesso não é válido.");
    // O pago é sempre calculado das entradas de dentro do passe, nunca das enviadas soltas.
    const entradas = entradasDoPasse(c);
    if (passeVencido(c, s.agora())) {
      return json(await montarResposta(entradas, s, { completo: false, aviso: "expirado" }));
    }
    let pagamento;
    try {
      pagamento = await s.mp.obter(c.pagamento_id);
    } catch {
      return json(await montarResposta(entradas, s, { completo: false, aviso: "verificacao_indisponivel" }));
    }
    const libera = pagamento !== null && pagamentoLibera(pagamento, await referenciaDe(entradas, s));
    return json(
      await montarResposta(entradas, s, {
        completo: libera,
        versaoConteudo: c.content_version,
        aviso: libera ? undefined : "reembolsado",
      }),
    );
  }

  const entradas = exigirEntradas(corpo?.entradas, s);
  return json(await montarResposta(entradas, s, { completo: false }));
}
