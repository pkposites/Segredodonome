// POST /checkout, POST /pagamento/status e POST /recuperar (worker/API.md).
import { z } from "zod";
import { diaSaoPaulo, normalizarCampanha, normalizarVariante, type Etapa } from "../banco";
import {
  DESCRICAO_PIX,
  DESCRICAO_PIX_CASAL,
  PIX_VALIDADE_PADRAO_MIN,
  PRECO_COM_BUMP_CENTAVOS,
  PRODUTO_CASAL,
  PRODUTO_NOME,
  SUFIXO_REFERENCIA_CASAL,
  centavos,
  incluiCasalNoValor,
  precoDoResultado,
} from "../catalogo";
import { abrirPasse, passeVencido } from "../cripto/passe";
import { erroGenerico404, ErroHttp, json, lerJson } from "../http";
import { pagamentoLibera, pagamentoLiberaCasal, statusPublico, type Pagamento } from "../mercadopago";
import { customDataProduto } from "../meta";
import type { Entradas } from "../motor";
import { normalizarNome } from "../motor/normalizar";
import { dadosUsuario, ipDe, recusouMedicao, type Servicos } from "../servicos";
import {
  comprovante,
  entradasDoPasse,
  exigirEntradas,
  montarResposta,
  passeParaPagamento,
  referenciaCasalDe,
  referenciaDe,
  temCasal,
  urlDoSite,
} from "./comum";

const esquemaCheckout = z.object({
  idempotency_key: z.string().uuid(),
  incluir_casal: z.boolean().optional(),
  produto: z.enum(["nome", "casal", "segundo_nome"]).optional(),
  passe: z.string().max(4096).optional(),
  parceria: z
    .object({
      nome: z.string().trim().min(2).max(80),
      data_nascimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })
    .optional(),
});

/** Respostas do meio do caminho: a leitura extra de outro nome não refaz as 5 escolhas. */
const RESPOSTAS_EQUILIBRADAS = [1, 1, 1, 1, 1] as const;

/**
 * O Mercado Pago exige um e-mail no Pix, mas o comprador não precisa ter conta lá.
 * Para não pedir nada à pessoa, cada Pix leva um endereço técnico do próprio site.
 */
export const emailTecnico = (idempotencyKey: string) => `pix-${idempotencyKey.slice(0, 8)}@relatoriorda.com.br`;

export const LIMITE_RECUPERAR_POR_HORA = 10;

function indisponivel(e?: unknown): never {
  console.warn("Mercado Pago indisponível:", e instanceof Error ? e.message.slice(0, 340) : "erro");
  throw new ErroHttp(502, "pagamento_indisponivel", "O Mercado Pago não respondeu. Tente de novo em instantes.");
}

function validadeMinutos(s: Servicos) {
  const n = Number(s.env.PIX_VALIDADE_MINUTOS ?? String(PIX_VALIDADE_PADRAO_MIN));
  return Number.isFinite(n) && n >= 30 && n <= 24 * 60 ? n : PIX_VALIDADE_PADRAO_MIN;
}

async function exigirCompra(passe: string | undefined, s: Servicos): Promise<{ entradas: Entradas; pagamento: Pagamento }> {
  if (!passe) throw new ErroHttp(403, "sem_acesso", "Esta oferta é para quem já comprou.");
  const c = await abrirPasse(passe, s.chavesPasse);
  if (!c) throw new ErroHttp(400, "passe_invalido", "Este link de acesso não é válido.");
  if (passeVencido(c, s.agora())) throw new ErroHttp(403, "expirado", "Este link de acesso venceu (validade de 12 meses).");
  const entradas = entradasDoPasse(c);
  let pagamento: Pagamento | null;
  try {
    pagamento = await s.mp.obter(c.pagamento_id);
  } catch {
    throw new ErroHttp(502, "verificacao_indisponivel", "Não conseguimos confirmar o pagamento agora. Tente de novo em instantes.");
  }
  if (!pagamento || !pagamentoLibera(pagamento, await referenciaDe(entradas, s))) {
    throw new ErroHttp(403, "sem_acesso", "Este acesso não está mais ativo.");
  }
  return { entradas, pagamento };
}

export async function postCheckout(req: Request, s: Servicos): Promise<Response> {
  const corpo = (await lerJson(req)) as Record<string, unknown>;
  const c = esquemaCheckout.safeParse(corpo);
  if (!c.success) throw new ErroHttp(400, "checkout_invalido", "Não foi possível gerar o Pix. Tente de novo.");

  const produto = c.data.produto ?? "nome";
  let entradas: Entradas;
  let valorCentavos = PRODUTO_NOME.precoCentavos;
  let referencia: string;
  let descricao = DESCRICAO_PIX;
  let etapaExtra: Etapa | null = null;
  const incluirCasal = produto === "nome" && c.data.incluir_casal === true;

  if (produto === "nome") {
    entradas = exigirEntradas(corpo.entradas, s);
    valorCentavos = incluirCasal ? PRECO_COM_BUMP_CENTAVOS : PRODUTO_NOME.precoCentavos;
    referencia = await referenciaDe(entradas, s);
    if (incluirCasal) etapaExtra = "bump_aceito";
  } else {
    const compra = await exigirCompra(c.data.passe, s);
    if (produto === "casal") {
      entradas = compra.entradas;
      if (await temCasal(s, entradas, compra.pagamento)) {
        throw new ErroHttp(409, "ja_incluso", "A compatibilidade do casal já está na sua compra.");
      }
      valorCentavos = PRODUTO_CASAL.precoCentavos;
      referencia = await referenciaCasalDe(entradas, s);
      descricao = DESCRICAO_PIX_CASAL;
      etapaExtra = "upsell_aceito";
    } else {
      if (!c.data.parceria) throw new ErroHttp(400, "parceria_invalida", "Informe o nome e a data de nascimento da outra pessoa.");
      entradas = exigirEntradas(
        { nome: c.data.parceria.nome, data_nascimento: c.data.parceria.data_nascimento, tratamento: "neutro", respostas: [...RESPOSTAS_EQUILIBRADAS] },
        s,
      );
      const mesmo =
        normalizarNome(entradas.nome)?.normalizado === normalizarNome(compra.entradas.nome)?.normalizado &&
        entradas.data_nascimento === compra.entradas.data_nascimento;
      if (mesmo) throw new ErroHttp(400, "mesma_pessoa", "Esta já é a sua carta. A leitura extra é para outra pessoa.");
      valorCentavos = PRODUTO_NOME.precoCentavos;
      referencia = await referenciaDe(entradas, s);
      etapaExtra = "upsell_aceito";
    }
  }

  const eventId = crypto.randomUUID();
  const medir = !recusouMedicao(corpo);
  const usuario = medir ? await dadosUsuario(req, corpo) : {};
  const utm = normalizarCampanha(corpo.utm_campaign);
  const variante = normalizarVariante(corpo.variante);

  let pagamento;
  try {
    pagamento = await s.mp.criarPix({
      email: emailTecnico(c.data.idempotency_key),
      externalReference: referencia,
      descricao,
      valorCentavos,
      metadata: Object.fromEntries(
        Object.entries({
          fbp: usuario.fbp,
          fbc: usuario.fbc,
          client_user_agent: usuario.client_user_agent?.slice(0, 250),
          external_id: usuario.external_id,
          event_id: eventId,
          utm_campaign: utm,
          variante,
          produto,
          bump: incluirCasal ? "sim" : undefined,
          medir: medir ? undefined : "nao",
        }).filter(([, v]) => typeof v === "string"),
      ) as Record<string, string>,
      idempotencyKey: c.data.idempotency_key,
      expiraEm: new Date(s.agora().getTime() + validadeMinutos(s) * 60_000),
      notificationUrl: new URL("/webhook/mercadopago", req.url).toString(),
    });
  } catch (e) {
    indisponivel(e);
  }

  const agora = s.agora();
  s.depois(s.banco.incrementar(diaSaoPaulo(agora), "pix_gerado", utm, variante));
  if (etapaExtra) s.depois(s.banco.incrementar(diaSaoPaulo(agora), etapaExtra, utm, variante));
  if (medir) {
    s.depois(
      s.meta.enviar({
        event_name: "InitiateCheckout",
        event_id: eventId,
        event_time: Math.floor(agora.getTime() / 1000),
        event_source_url: urlDoSite(s, "/r"),
        action_source: "website",
        user_data: usuario,
        custom_data: customDataProduto("InitiateCheckout", undefined, valorCentavos),
      }),
    );
  }

  return json(
    {
      pagamento_id: pagamento.id,
      qr_code_base64: pagamento.pix.qr_code_base64,
      copia_e_cola: pagamento.pix.qr_code,
      ticket_url: pagamento.pix.ticket_url,
      expira_em: pagamento.expira_em,
      event_id_checkout: eventId,
      valor: pagamento.valor,
      produto,
      inclui_casal: incluirCasal,
    },
    201,
  );
}

async function compraMedida(req: Request, s: Servicos, p: Pagamento, corpo: Record<string, unknown>) {
  const aprovado = new Date(p.aprovado_em ?? p.criado_em);
  if (!recusouMedicao(corpo) && p.metadata.medir !== "nao") {
    s.depois(
      s.meta.enviar({
        event_name: "Purchase",
        event_id: `compra-${p.id}`,
        event_time: Math.floor(aprovado.getTime() / 1000),
        event_source_url: urlDoSite(s, "/r"),
        action_source: "website",
        user_data: await dadosUsuario(req, corpo),
        custom_data: customDataProduto("Purchase", p.id, centavos(p.valor)),
      }),
    );
  }
}

export async function postStatus(req: Request, s: Servicos): Promise<Response> {
  const corpo = (await lerJson(req)) as Record<string, unknown>;
  const entradas = exigirEntradas(corpo?.entradas, s);
  const id = typeof corpo?.pagamento_id === "string" ? corpo.pagamento_id : "";

  let p: Pagamento | null;
  try {
    p = await s.mp.obter(id);
  } catch (e) {
    indisponivel(e);
  }
  const referencia = await referenciaDe(entradas, s);
  const refCasal = `${referencia}${SUFIXO_REFERENCIA_CASAL}`;
  if (!p) throw erroGenerico404();
  const ehCasal = p.external_reference === refCasal;
  const ehNome = p.external_reference === referencia;
  if (ehNome && !precoDoResultado(centavos(p.valor))) throw erroGenerico404();
  if (ehCasal && centavos(p.valor) !== PRODUTO_CASAL.precoCentavos) throw erroGenerico404();
  if (!ehNome && !ehCasal) throw erroGenerico404();

  const status = statusPublico(p, s.agora());
  if (status !== "approved") return json({ status });

  if (ehCasal) {
    if (!pagamentoLiberaCasal(p, refCasal)) return json({ status: p.valor_reembolsado > 0 ? "refunded" : status });
    await compraMedida(req, s, p, corpo);
    return json({
      status: "approved",
      upsell: "casal",
      casal_incluso: true,
      comprovante: comprovante(p),
      event_id_purchase: `compra-${p.id}`,
    });
  }

  if (!pagamentoLibera(p, referencia)) return json({ status });
  await compraMedida(req, s, p, corpo);
  const resposta = await montarResposta(entradas, s, { completo: true });
  let casal = incluiCasalNoValor(centavos(p.valor));
  try {
    casal = await temCasal(s, entradas, p);
  } catch {
    // Sem a busca do upsell, vale o que este Pix já inclui.
  }
  return json({
    status,
    passe: await passeParaPagamento(entradas, p, s),
    comprovante: comprovante(p),
    gratis: resposta.gratis,
    completo: resposta.completo,
    versoes: resposta.versoes,
    event_id_purchase: `compra-${p.id}`,
    casal_incluso: casal,
  });
}

export async function postRecuperar(req: Request, s: Servicos): Promise<Response> {
  const ip = ipDe(req);
  const umaHora = new Date(s.agora().getTime() - 3600_000);
  if ((await s.banco.contarAcessos(ip, "/recuperar", umaHora)) >= LIMITE_RECUPERAR_POR_HORA) {
    throw new ErroHttp(429, "muitas_tentativas", "Muitas tentativas. Tente de novo mais tarde.");
  }
  const corpo = (await lerJson(req)) as Record<string, unknown>;
  const entradas = exigirEntradas(corpo?.entradas, s);
  const referencia = await referenciaDe(entradas, s);

  let lista;
  try {
    lista = await s.mp.buscarAprovadosPorReferencia(referencia, 365);
  } catch (e) {
    indisponivel(e);
  }
  const limite = s.agora().getTime() - 365 * 86400_000;
  const p = lista.find((x) => pagamentoLibera(x, referencia) && Date.parse(x.aprovado_em ?? x.criado_em) >= limite);
  if (!p) throw erroGenerico404();

  const resposta = await montarResposta(entradas, s, { completo: true });
  let casal = incluiCasalNoValor(centavos(p.valor));
  try {
    casal = await temCasal(s, entradas, p);
  } catch {
    // Sem a busca do upsell, vale o que este Pix já inclui.
  }
  return json({
    passe: await passeParaPagamento(entradas, p, s),
    comprovante: comprovante(p),
    gratis: resposta.gratis,
    completo: resposta.completo,
    versoes: resposta.versoes,
    casal_incluso: casal,
  });
}
