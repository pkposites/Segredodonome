// WhatsApp opcional na tela do Pix (decisão de 13/11/2026).
// Só grava com a caixa de consentimento marcada. Não envia mensagem: o painel lista para o Rob mandar.
// O rascunho das entradas fica cifrado, para o link abrir em outro navegador (o do WhatsApp não é o do Instagram).
import { z } from "zod";
import { CONTENT_VERSION } from "../conteudo/biblioteca";
import { emitirPasse, expiraEm, abrirPasse } from "../cripto/passe";
import { paraBase64url } from "../cripto/base64url";
import { ErroHttp, erroGenerico404, json, lerJson } from "../http";
import { centavos, precoAceito, reais } from "../catalogo";
import { statusPublico } from "../mercadopago";
import { ipDe, type Servicos } from "../servicos";
import { entradasDoPasse, exigirEntradas, referenciaCasalDe, referenciaDe, urlDoSite } from "./comum";

export const VERSAO_TEXTO_WHATSAPP = "2026-11-a";
const LIMITE_POR_HORA = 8;

export function normalizarWhatsapp(bruto: string): string | null {
  let d = bruto.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 11) d = `55${d}`;
  if (!/^55[1-9][0-9]9[0-9]{8}$/.test(d)) return null;
  return d;
}

const esquema = z.object({
  pagamento_id: z.string().regex(/^\d{1,20}$/),
  whatsapp: z.string().max(24),
  consentimento: z.literal(true),
  versao: z.literal(VERSAO_TEXTO_WHATSAPP),
});

async function dentroDoLimite(req: Request, s: Servicos, rota: string) {
  const desde = new Date(s.agora().getTime() - 3600_000);
  if ((await s.banco.contarAcessos(ipDe(req), rota, desde)) >= LIMITE_POR_HORA) {
    throw new ErroHttp(429, "muitas_tentativas", "Muitas tentativas. Tente de novo mais tarde.");
  }
}

export function mensagemRetomada(valor: number, link: string) {
  const preco = `R$ ${valor.toFixed(2).replace(".", ",")}`;
  return `Oi! Aqui é do Segredo do Nome. Seu Pix de ${preco} continua neste link: ${link}. Para não receber mais mensagens, responda SAIR.`;
}

export async function postContato(req: Request, s: Servicos): Promise<Response> {
  await dentroDoLimite(req, s, "/recuperacao/contato");
  const corpo = (await lerJson(req)) as Record<string, unknown>;
  const c = esquema.safeParse(corpo);
  if (!c.success) throw new ErroHttp(400, "contato_invalido", "Para guardar o WhatsApp, marque a autorização e confira o número com DDD.");
  const numero = normalizarWhatsapp(c.data.whatsapp);
  if (!numero) throw new ErroHttp(400, "whatsapp_invalido", "Confira o WhatsApp: DDD e número com 9 dígitos.");
  const entradas = exigirEntradas(corpo.entradas, s);

  let pagamento;
  try {
    pagamento = await s.mp.obter(c.data.pagamento_id);
  } catch {
    throw new ErroHttp(502, "pagamento_indisponivel", "O Mercado Pago não respondeu. Tente de novo em instantes.");
  }
  const referencia = await referenciaDe(entradas, s);
  const refCasal = await referenciaCasalDe(entradas, s);
  const ref = pagamento?.external_reference;
  if (!pagamento || (ref !== referencia && ref !== refCasal) || !precoAceito(centavos(pagamento.valor))) {
    throw erroGenerico404();
  }
  if (statusPublico(pagamento, s.agora()) !== "pending") {
    throw new ErroHttp(409, "pix_encerrado", "Este Pix não está mais pendente.");
  }

  const agora = s.agora();
  const token = paraBase64url(crypto.getRandomValues(new Uint8Array(16)));
  const rascunho = await emitirPasse(
    {
      v: 1,
      nome: entradas.nome,
      data: entradas.data_nascimento,
      tratamento: entradas.tratamento,
      respostas: entradas.respostas,
      pagamento_id: "rascunho",
      content_version: CONTENT_VERSION,
      emitido_em: agora.toISOString(),
      expira_em: expiraEm(agora).toISOString(),
    },
    s.chavesPasse,
  );
  await s.banco.salvarPixRecuperacao({
    pagamento_id: pagamento.id,
    whatsapp: numero,
    consentimento_em: agora.toISOString(),
    versao_texto: VERSAO_TEXTO_WHATSAPP,
    valor_centavos: centavos(pagamento.valor),
    expira_em: pagamento.expira_em ?? new Date(agora.getTime() + 6 * 3600_000).toISOString(),
    criado_em: agora.toISOString(),
    token,
    rascunho,
    status: "pendente",
  });
  return json({ ok: true });
}

export async function postAbrir(req: Request, s: Servicos): Promise<Response> {
  await dentroDoLimite(req, s, "/recuperacao/abrir");
  const corpo = (await lerJson(req)) as { token?: unknown };
  const token = typeof corpo?.token === "string" ? corpo.token : "";
  if (!/^[A-Za-z0-9_-]{16,80}$/.test(token)) throw erroGenerico404();
  const reg = await s.banco.lerPixPorToken(token);
  if (!reg || Date.parse(reg.criado_em) < s.agora().getTime() - 7 * 86400_000) throw erroGenerico404();
  const aberto = await abrirPasse(reg.rascunho, s.chavesPasse);
  if (!aberto) throw erroGenerico404();
  const entradas = entradasDoPasse(aberto);

  let pagamento;
  try {
    pagamento = await s.mp.obter(reg.pagamento_id);
  } catch {
    return json({ entradas, status: "pendente" });
  }
  if (pagamento && statusPublico(pagamento, s.agora()) === "approved") {
    await s.banco.apagarPixRecuperacao(reg.pagamento_id);
    return json({ entradas, status: "pago" });
  }
  if (!pagamento || statusPublico(pagamento, s.agora()) !== "pending") {
    return json({ entradas, status: "expirado" });
  }
  return json({
    entradas,
    status: "pending",
    pix: {
      pagamento_id: pagamento.id,
      copia_e_cola: pagamento.pix.qr_code,
      qr_code_base64: pagamento.pix.qr_code_base64,
      ticket_url: pagamento.pix.ticket_url,
      expira_em: pagamento.expira_em,
      valor: pagamento.valor,
    },
  });
}

export async function listarParaPainel(s: Servicos) {
  const lista = await s.banco.listarPixPendentes();
  return lista.map((p) => {
    const link = urlDoSite(s, `/r#w=${p.token}`);
    const texto = mensagemRetomada(reais(p.valor_centavos), link);
    return {
      pagamento_id: p.pagamento_id,
      whatsapp: p.whatsapp,
      valor_centavos: p.valor_centavos,
      criado_em: p.criado_em,
      expira_em: p.expira_em,
      link,
      whatsapp_link: `https://wa.me/${p.whatsapp}?text=${encodeURIComponent(texto)}`,
    };
  });
}
