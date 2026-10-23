// Bindings e variáveis do Worker. Segredos via `wrangler secret put` (produção) ou
// `.dev.vars` (local). Nomes conforme docs/SEGURANCA_E_LGPD.md, 3.

export interface Env {
  /** Opcional: sem ele o site funciona, mas sem registro de acesso, contadores e painel. */
  DB?: D1Database;
  /** Rate limit por IP (binding `ratelimits`, janela de 60 s). Opcional em dev. */
  LIMITE?: RateLimit;

  MP_ACCESS_TOKEN: string;
  MP_WEBHOOK_SECRET: string;
  /** Segredo único: as três chaves abaixo são derivadas dele quando não cadastradas (padroes.ts). */
  SEGREDO?: string;
  SEGREDO_CHAVE: string;
  SEGREDO_PASSE: string;
  /** Versão (1–255) da chave atual do passe. Padrão 1. */
  SEGREDO_PASSE_VERSAO?: string;
  /** Chave anterior, só para abrir passes antigos depois de uma rotação. */
  SEGREDO_PASSE_ANTERIOR?: string;
  SEGREDO_PASSE_ANTERIOR_VERSAO?: string;
  SEGREDO_SEMENTE: string;

  META_PIXEL_ID?: string;
  META_CAPI_TOKEN?: string;
  META_TEST_EVENT_CODE?: string;
  /** Versão da Graph API (ex.: v26.0). Confirmar a vigente na documentação da Meta. */
  META_GRAPH_VERSION?: string;

  /** Opcional. Avisos de venda (Web Push): JWK P-256 privado. Sem ele, o Worker gera um e guarda no banco. */
  VAPID_PRIVADA?: string;
  /** Chave do link secreto do painel (24+ caracteres): /painel?k=CHAVE. */
  PAINEL_CHAVE?: string;
  ADMIN_EMAILS: string;
  CF_ACCESS_AUD: string;
  /** https://<equipe>.cloudflareaccess.com */
  CF_ACCESS_TEAM_DOMAIN: string;

  /** Origem do front, ex.: https://segredodonome.com.br (CORS e event_source_url). */
  PUBLIC_BASE_URL: string;
  /** SÓ DESENVOLVIMENTO: aponta para o simulador local (scripts/mp-simulado.mjs). Ignorado em produção. */
  MP_API_BASE?: string;
  /** "production" desliga MP_API_BASE. */
  AMBIENTE?: string;
  /** Validade do Pix em minutos. Padrão 30. */
  PIX_VALIDADE_MINUTOS?: string;
}
