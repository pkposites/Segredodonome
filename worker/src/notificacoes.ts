// Avisos de venda no celular do Rob. Guarda só os endereços de push dos aparelhos dele e a
// última mensagem (sem nenhum dado de cliente), na tabela config.
import { diaSaoPaulo, type Banco } from "./banco";
import { endpointValido } from "./push";
import type { Servicos } from "./servicos";

const CHAVE = "push";
export const MAX_APARELHOS = 5;

export interface Mensagem {
  titulo: string;
  corpo: string;
  em: string;
}

interface Estado {
  aparelhos: string[];
  mensagem?: Mensagem;
}

export async function lerEstado(banco: Banco): Promise<Estado> {
  try {
    const e = JSON.parse((await banco.lerValor(CHAVE)) ?? "{}") as Partial<Estado>;
    return { aparelhos: (e.aparelhos ?? []).filter(endpointValido), mensagem: e.mensagem };
  } catch {
    return { aparelhos: [] };
  }
}

const gravar = (banco: Banco, e: Estado) => banco.gravarValor(CHAVE, JSON.stringify(e));

export async function adicionarAparelho(banco: Banco, endpoint: string) {
  const e = await lerEstado(banco);
  e.aparelhos = [endpoint, ...e.aparelhos.filter((a) => a !== endpoint)].slice(0, MAX_APARELHOS);
  await gravar(banco, e);
  return e.aparelhos.length;
}

export async function removerAparelho(banco: Banco, endpoint: string) {
  const e = await lerEstado(banco);
  e.aparelhos = e.aparelhos.filter((a) => a !== endpoint);
  await gravar(banco, e);
  return e.aparelhos.length;
}

/** Guarda a mensagem e avisa todos os aparelhos; remove os que o serviço de push diz que sumiram. */
export async function notificar(s: Servicos, titulo: string, corpo: string): Promise<{ enviados: number; falhas: number }> {
  if (!s.push.ligado()) return { enviados: 0, falhas: 0 };
  const e = await lerEstado(s.banco);
  if (e.aparelhos.length === 0) return { enviados: 0, falhas: 0 };
  e.mensagem = { titulo, corpo, em: s.agora().toISOString() };
  await gravar(s.banco, e);

  const status = await Promise.all(e.aparelhos.map((a) => s.push.enviar(a).catch(() => 0)));
  const sumiram = e.aparelhos.filter((_, i) => status[i] === 404 || status[i] === 410);
  if (sumiram.length) {
    e.aparelhos = e.aparelhos.filter((a) => !sumiram.includes(a));
    await gravar(s.banco, e);
  }
  const enviados = status.filter((c) => c >= 200 && c < 300).length;
  if (enviados < status.length) console.warn(`push: ${enviados} de ${status.length} avisos aceitos (status ${status.join(",")})`);
  return { enviados, falhas: status.length - enviados };
}

/** Aviso de venda: só valor e o total do dia, nada da compradora. */
export async function avisarVenda(s: Servicos, aprovado: Date) {
  const hoje = diaSaoPaulo(aprovado);
  const vendasHoje = (await s.banco.contadores(hoje, hoje)).pix_pago;
  const corpo = vendasHoje > 1 ? `R$ 11,90 · ${vendasHoje}ª venda de hoje` : "R$ 11,90 · primeira venda de hoje";
  return notificar(s, "💰 Nova venda no Segredo do Nome!", corpo);
}
