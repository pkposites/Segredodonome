// Bindings e variáveis do Worker. Segredos via `wrangler secret put` (produção) ou
// `.dev.vars` (local). Nomes conforme docs/SEGURANCA_E_LGPD.md, 3.

export interface Env {
  DB: D1Database;
  /** Rate limit por IP (binding `ratelimits`, janela de 60 s). Opcional em dev. */
  LIMITE?: RateLimit;

  MP_ACCESS_TOKEN: string;
  MP_WEBHOOK_SECRET: string;
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
  /** Versão da Graph API (ex.: v24.0). Confirmar a vigente na documentação da Meta. */
  META_GRAPH_VERSION?: string;

  ADMIN_EMAILS: string;
  CF_ACCESS_AUD: string;
  /** https://<equipe>.cloudflareaccess.com */
  CF_ACCESS_TEAM_DOMAIN: string;

  /** Origem do front, ex.: https://segredodonome.com.br (CORS e event_source_url). */
  PUBLIC_BASE_URL: string;
  /** Validade do Pix em minutos. Padrão 30. */
  PIX_VALIDADE_MINUTOS?: string;
}
