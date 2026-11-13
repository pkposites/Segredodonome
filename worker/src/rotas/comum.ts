// Peças compartilhadas pelas rotas públicas.
import { biblioteca, CONTENT_VERSION } from "../conteudo/biblioteca";
import { montarCompleto, montarGratis, montarOferta, type ResultadoCompleto, type ResultadoGratis } from "../conteudo/montar";
import { ALGORITHM_VERSION, calcularPerfil, type Entradas } from "../motor";
import { normalizarNome } from "../motor/normalizar";
import { gerarChave, referenciaExterna } from "../motor/semente";
import { emitirPasse, expiraEm, type ConteudoPasse } from "../cripto/passe";
import { PRODUTO_NOME, SUFIXO_REFERENCIA_CASAL, centavos, incluiCasalNoValor, reais } from "../catalogo";
import { pagamentoLiberaCasal, type Pagamento } from "../mercadopago";
import type { Servicos } from "../servicos";
import { ErroHttp } from "../http";
import { validarEntradas } from "../entradas";

export interface RespostaResultado {
  gratis: ResultadoGratis;
  oferta: { preco: number; moeda: string; secoes: ReturnType<typeof montarOferta>["secoes"] } | null;
  completo: ResultadoCompleto | null;
  versoes: { algoritmo: string; conteudo: string };
  aviso?: "reembolsado" | "expirado" | "verificacao_indisponivel";
}

export function exigirEntradas(bruto: unknown, s: Servicos): Entradas {
  const v = validarEntradas(bruto, s.agora());
  if (!v.ok) throw new ErroHttp(v.erro.erro === "idade" ? 403 : 400, v.erro.erro, v.erro.mensagem);
  return v.entradas;
}

export async function referenciaDe(entradas: Entradas, s: Servicos): Promise<string> {
  const nome = normalizarNome(entradas.nome)!;
  return referenciaExterna(await gerarChave(s.env.SEGREDO_CHAVE, nome.normalizado, entradas.data_nascimento));
}

export const referenciaCasalDe = async (entradas: Entradas, s: Servicos) =>
  `${await referenciaDe(entradas, s)}${SUFIXO_REFERENCIA_CASAL}`;

/** O pagamento do nome já inclui o casal, ou existe um Pix aprovado só do adicional. */
export async function temCasal(s: Servicos, entradas: Entradas, pagamentoNome: Pagamento): Promise<boolean> {
  if (incluiCasalNoValor(centavos(pagamentoNome.valor))) return true;
  const ref = await referenciaCasalDe(entradas, s);
  const lista = await s.mp.buscarAprovadosPorReferencia(ref, 365);
  return lista.some((p) => pagamentoLiberaCasal(p, ref));
}

/** Monta grátis + (oferta ou completo). O completo só é pedido depois de o pagamento ser confirmado. */
export async function montarResposta(
  entradas: Entradas,
  s: Servicos,
  opcoes: { completo: boolean; versaoConteudo?: string; aviso?: RespostaResultado["aviso"] },
): Promise<RespostaResultado> {
  const b = biblioteca(opcoes.versaoConteudo) ?? biblioteca(CONTENT_VERSION)!;
  const perfil = await calcularPerfil(entradas, s.env.SEGREDO_SEMENTE);
  const resp: RespostaResultado = {
    gratis: montarGratis(b, perfil),
    oferta: opcoes.completo
      ? null
      : { preco: reais(PRODUTO_NOME.precoCentavos), moeda: PRODUTO_NOME.moeda, secoes: montarOferta(b, perfil).secoes },
    completo: opcoes.completo ? montarCompleto(b, perfil) : null,
    versoes: { algoritmo: ALGORITHM_VERSION, conteudo: b.versao },
  };
  if (opcoes.aviso) resp.aviso = opcoes.aviso;
  return resp;
}

export function comprovante(p: Pagamento) {
  return {
    pagamento_id: p.id,
    data_hora: p.aprovado_em ?? p.criado_em,
    valor: p.valor, // o que foi pago (o preço mudou em 23/10/2026)
    forma: "Pix" as const,
  };
}

export async function passeParaPagamento(entradas: Entradas, p: Pagamento, s: Servicos, versaoConteudo = CONTENT_VERSION) {
  const aprovado = new Date(p.aprovado_em ?? p.criado_em);
  const conteudo: ConteudoPasse = {
    v: 1,
    nome: entradas.nome,
    data: entradas.data_nascimento,
    tratamento: entradas.tratamento,
    respostas: entradas.respostas,
    pagamento_id: p.id,
    content_version: versaoConteudo,
    emitido_em: s.agora().toISOString(),
    expira_em: expiraEm(aprovado).toISOString(),
  };
  return emitirPasse(conteudo, s.chavesPasse);
}

export const entradasDoPasse = (c: ConteudoPasse): Entradas => ({
  nome: c.nome,
  data_nascimento: c.data,
  tratamento: c.tratamento,
  respostas: c.respostas,
});

export const urlDoSite = (s: Servicos, caminho: string) => new URL(caminho, s.env.PUBLIC_BASE_URL).toString();
