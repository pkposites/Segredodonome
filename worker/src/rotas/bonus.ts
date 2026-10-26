// POST /bonus/casal (worker/API.md): bônus "Compatibilidade do casal", só para quem comprou.
// Mesma regra do pago: passe válido e pagamento conferido no Mercado Pago a cada pedido.
// Nome e data da outra pessoa só existem em memória: nada vai para banco, log, Pixel ou API de Conversões.
import { z } from "zod";
import { abrirPasse, passeVencido } from "../cripto/passe";
import { montarCasal } from "../conteudo/casal";
import { dataValida, hojeEmSaoPaulo, idadeEm, IDADE_MAXIMA, IDADE_MINIMA } from "../entradas";
import { ErroHttp, json, lerJson } from "../http";
import { pagamentoLibera } from "../mercadopago";
import { normalizarNome } from "../motor/normalizar";
import type { Servicos } from "../servicos";
import { referenciaDe, entradasDoPasse } from "./comum";

const esquemaParceria = z.object({
  nome: z.string().trim().min(2).max(80),
  data_nascimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function postBonusCasal(req: Request, s: Servicos): Promise<Response> {
  const corpo = (await lerJson(req)) as { passe?: unknown; parceria?: unknown };
  if (typeof corpo?.passe !== "string" || corpo.passe.length === 0) {
    throw new ErroHttp(403, "sem_acesso", "O bônus do casal é liberado junto com o resultado completo.");
  }
  const c = await abrirPasse(corpo.passe, s.chavesPasse);
  if (!c) throw new ErroHttp(400, "passe_invalido", "Este link de acesso não é válido.");
  if (passeVencido(c, s.agora())) throw new ErroHttp(403, "expirado", "Este link de acesso venceu (validade de 12 meses).");

  const v = esquemaParceria.safeParse(corpo.parceria);
  if (!v.success) throw new ErroHttp(400, "parceria_invalida", "Confira o nome e a data de nascimento da outra pessoa.");
  const nomeParceria = normalizarNome(v.data.nome);
  if (!nomeParceria) throw new ErroHttp(400, "nome", "Confira o nome: precisamos de pelo menos 2 letras.");
  if (!dataValida(v.data.data_nascimento)) throw new ErroHttp(400, "data", "Confira a data de nascimento.");
  const idade = idadeEm(v.data.data_nascimento, hojeEmSaoPaulo(s.agora()));
  if (idade < IDADE_MINIMA) throw new ErroHttp(403, "idade", "A compatibilidade do casal é só para maiores de 18 anos.");
  if (idade > IDADE_MAXIMA) throw new ErroHttp(400, "data", "Confira a data de nascimento.");

  const entradas = entradasDoPasse(c);
  let pagamento;
  try {
    pagamento = await s.mp.obter(c.pagamento_id);
  } catch {
    throw new ErroHttp(502, "verificacao_indisponivel", "Não conseguimos confirmar o pagamento agora. Tente de novo em instantes.");
  }
  if (!pagamento || !pagamentoLibera(pagamento, await referenciaDe(entradas, s))) {
    throw new ErroHttp(403, "sem_acesso", "Este acesso não está mais ativo.");
  }

  const nomeVoce = normalizarNome(entradas.nome)!;
  return json({
    casal: montarCasal({ nome: nomeVoce, data: entradas.data_nascimento }, { nome: nomeParceria, data: v.data.data_nascimento }),
  });
}
