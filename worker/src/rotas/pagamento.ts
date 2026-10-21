// POST /checkout, POST /pagamento/status e POST /recuperar (worker/API.md).
import { z } from "zod";
import { diaSaoPaulo, normalizarCampanha, normalizarVariante } from "../banco";
import { DESCRICAO_PIX } from "../catalogo";
import { erroGenerico404, ErroHttp, json, lerJson } from "../http";
import { centavos, PRODUTO_NOME } from "../catalogo";
import { pagamentoLibera, statusPublico } from "../mercadopago";
import { customDataProduto } from "../meta";
import { dadosUsuario, ipDe, type Servicos } from "../servicos";
import { comprovante, exigirEntradas, montarResposta, passeParaPagamento, referenciaDe, urlDoSite } from "./comum";

const esquemaCheckout = z.object({
  idempotency_key: z.string().uuid(),
});

/**
 * O Mercado Pago exige um e-mail no Pix, mas o comprador não precisa ter conta lá.
 * Para não pedir nada à pessoa, cada Pix leva um endereço técnico do próprio site.
 */
export const emailTecnico = (idempotencyKey: string) => `pix-${idempotencyKey.slice(0, 8)}@relatoriorda.com.br`;

export const LIMITE_RECUPERAR_POR_HORA = 10;

function indisponivel(e?: unknown): never {
  // Só a mensagem técnica (status HTTP ou falha de rede); nunca o corpo da requisição.
  console.warn("Mercado Pago indisponível:", e instanceof Error ? e.message.slice(0, 340) : "erro");
  throw new ErroHttp(502, "pagamento_indisponivel", "O Mercado Pago não respondeu. Tente de novo em instantes.");
}

export async function postCheckout(req: Request, s: Servicos): Promise<Response> {
  const corpo = (await lerJson(req)) as Record<string, unknown>;
  const entradas = exigirEntradas(corpo?.entradas, s);
  const c = esquemaCheckout.safeParse(corpo);
  if (!c.success) throw new ErroHttp(400, "checkout_invalido", "Não foi possível gerar o Pix. Tente de novo.");

  const referencia = await referenciaDe(entradas, s);
  const eventId = crypto.randomUUID();
  const usuario = await dadosUsuario(req, corpo);
  const utm = normalizarCampanha(corpo.utm_campaign);
  const variante = normalizarVariante(corpo.variante);
  const validadeMin = Number(s.env.PIX_VALIDADE_MINUTOS ?? "30");

  let pagamento;
  try {
    pagamento = await s.mp.criarPix({
      email: emailTecnico(c.data.idempotency_key),
      externalReference: referencia,
      descricao: DESCRICAO_PIX,
      metadata: Object.fromEntries(
        Object.entries({ fbp: usuario.fbp, fbc: usuario.fbc, event_id: eventId, utm_campaign: utm, variante }).filter(
          ([, v]) => typeof v === "string",
        ),
      ) as Record<string, string>,
      idempotencyKey: c.data.idempotency_key,
      expiraEm: new Date(s.agora().getTime() + validadeMin * 60_000),
      notificationUrl: new URL("/webhook/mercadopago", req.url).toString(),
    });
  } catch (e) {
    indisponivel(e);
  }

  const agora = s.agora();
  s.depois(s.banco.incrementar(diaSaoPaulo(agora), "pix_gerado", utm, variante));
  s.depois(
    s.meta.enviar({
      event_name: "InitiateCheckout",
      event_id: eventId,
      event_time: Math.floor(agora.getTime() / 1000),
      event_source_url: urlDoSite(s, "/r"),
      action_source: "website",
      user_data: usuario,
      custom_data: customDataProduto("InitiateCheckout"),
    }),
  );

  return json(
    {
      pagamento_id: pagamento.id,
      qr_code_base64: pagamento.pix.qr_code_base64,
      copia_e_cola: pagamento.pix.qr_code,
      expira_em: pagamento.expira_em,
      event_id_checkout: eventId,
    },
    201,
  );
}

export async function postStatus(req: Request, s: Servicos): Promise<Response> {
  const corpo = (await lerJson(req)) as Record<string, unknown>;
  const entradas = exigirEntradas(corpo?.entradas, s);
  const id = typeof corpo?.pagamento_id === "string" ? corpo.pagamento_id : "";

  let p;
  try {
    p = await s.mp.obter(id);
  } catch (e) {
    indisponivel(e);
  }
  const referencia = await referenciaDe(entradas, s);
  if (!p || p.external_reference !== referencia || centavos(p.valor) !== PRODUTO_NOME.precoCentavos) {
    throw erroGenerico404();
  }

  const status = statusPublico(p, s.agora());
  if (status !== "approved" || !pagamentoLibera(p, referencia)) return json({ status });

  // Purchase também daqui: esta requisição vem do navegador (IP, navegador, fbp e fbc),
  // que a Meta exige em eventos de site. Mesmo event_id do webhook e do Pixel: a Meta deduplica.
  const aprovado = new Date(p.aprovado_em ?? p.criado_em);
  s.depois(
    s.meta.enviar({
      event_name: "Purchase",
      event_id: `compra-${p.id}`,
      event_time: Math.floor(aprovado.getTime() / 1000),
      event_source_url: urlDoSite(s, "/r"),
      action_source: "website",
      user_data: await dadosUsuario(req, corpo),
      custom_data: customDataProduto("Purchase", p.id),
    }),
  );

  const resposta = await montarResposta(entradas, s, { completo: true });
  return json({
    status,
    passe: await passeParaPagamento(entradas, p, s),
    comprovante: comprovante(p),
    gratis: resposta.gratis,
    completo: resposta.completo,
    versoes: resposta.versoes,
    event_id_purchase: `compra-${p.id}`,
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
  return json({
    passe: await passeParaPagamento(entradas, p, s),
    comprovante: comprovante(p),
    gratis: resposta.gratis,
    completo: resposta.completo,
    versoes: resposta.versoes,
  });
}
