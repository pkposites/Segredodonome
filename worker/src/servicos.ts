// Dependências de cada requisição, montadas a partir do Env. Os testes trocam por dublês.
import type { Env } from "./env";
import { BancoD1, BancoNulo, type Banco } from "./banco";
import { API_MERCADO_PAGO, MercadoPagoApi, type MercadoPago } from "./mercadopago";
import { MetaCapi, type DadosUsuario, type Meta } from "./meta";
import type { ChavesPasse } from "./cripto/passe";
import { sha256Hex } from "./cripto/hmac";
import type { ConfigAccess } from "./admin/access";
import { WebPush, type Notificador } from "./push";
import { chaveVapidDoBanco } from "./notificacoes";

export interface Servicos {
  env: Env;
  mp: MercadoPago;
  meta: Meta;
  banco: Banco;
  chavesPasse: ChavesPasse;
  access: ConfigAccess;
  push: Notificador;
  agora: () => Date;
  /** Trabalho fora do caminho crítico (ctx.waitUntil). */
  depois: (p: Promise<unknown>) => void;
}

export const GRAPH_PADRAO = "v26.0";

export function chavesDoEnv(env: Env): ChavesPasse {
  const atual = Number(env.SEGREDO_PASSE_VERSAO ?? "1");
  const segredos: Record<number, string> = { [atual]: env.SEGREDO_PASSE };
  if (env.SEGREDO_PASSE_ANTERIOR && env.SEGREDO_PASSE_ANTERIOR_VERSAO) {
    segredos[Number(env.SEGREDO_PASSE_ANTERIOR_VERSAO)] = env.SEGREDO_PASSE_ANTERIOR;
  }
  return { atual, segredos };
}

export function criarServicos(env: Env, ctx: ExecutionContext): Servicos {
  const banco: Banco = env.DB ? new BancoD1(env.DB) : new BancoNulo();
  return {
    env,
    mp: new MercadoPagoApi(
      env.MP_ACCESS_TOKEN,
      undefined,
      env.AMBIENTE !== "production" && env.MP_API_BASE ? env.MP_API_BASE : API_MERCADO_PAGO,
    ),
    meta: new MetaCapi(env.META_PIXEL_ID, env.META_CAPI_TOKEN, env.META_GRAPH_VERSION || GRAPH_PADRAO, env.META_TEST_EVENT_CODE),
    banco,
    chavesPasse: chavesDoEnv(env),
    access: { equipe: env.CF_ACCESS_TEAM_DOMAIN, aud: env.CF_ACCESS_AUD, emails: env.ADMIN_EMAILS, chaveLink: env.PAINEL_CHAVE },
    push: new WebPush(env.VAPID_PRIVADA ? env.VAPID_PRIVADA : () => chaveVapidDoBanco(banco), "mailto:qvnads@gmail.com"),
    agora: () => new Date(),
    depois: (p) => ctx.waitUntil(p.catch((e) => console.warn("tarefa em segundo plano falhou:", String(e)))),
  };
}

export const ipDe = (req: Request) => req.headers.get("cf-connecting-ip") ?? "0.0.0.0";

export interface Rastreio {
  /** false = a pessoa tocou em "Recusar" no aviso de cookies: nada vai à Meta (oposição, LGPD art. 18, § 2º). */
  medir?: unknown;
  fbp?: unknown;
  fbc?: unknown;
  sessao_id?: unknown;
}

const texto = (v: unknown, max = 255) => (typeof v === "string" && v.length > 0 && v.length <= max ? v : undefined);

export const recusouMedicao = (r: Rastreio | null | undefined) => r?.medir === false;

/** user_data da API de Conversões: IP, navegador, fbp, fbc e sessão (com hash). Nunca nome, data ou respostas. */
export async function dadosUsuario(req: Request, r: Rastreio): Promise<DadosUsuario> {
  const sessao = texto(r.sessao_id, 64);
  return {
    client_ip_address: req.headers.get("cf-connecting-ip") ?? undefined,
    client_user_agent: req.headers.get("user-agent") ?? undefined,
    fbp: texto(r.fbp),
    fbc: texto(r.fbc),
    external_id: sessao ? await sha256Hex(sessao) : undefined,
  };
}
