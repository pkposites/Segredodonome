// API de Conversões da Meta (RASTREAMENTO_META.md). Só eventos e parâmetros padrão.
// Nunca recebe nome, data, respostas, resultado ou e-mail.
import { PRODUTO_CASAL_ID, PRODUTO_NOME, reais } from "./catalogo";

export type NomeEventoMeta =
  | "PageView"
  | "ViewContent"
  | "AddToCart"
  | "AddToWishlist"
  | "InitiateCheckout"
  | "AddPaymentInfo"
  | "Purchase";

export interface DadosUsuario {
  client_ip_address?: string;
  client_user_agent?: string;
  fbp?: string;
  fbc?: string;
  external_id?: string;
}

export interface EventoMeta {
  event_name: NomeEventoMeta;
  event_id: string;
  event_time: number;
  event_source_url: string;
  action_source: "website";
  user_data: DadosUsuario;
  custom_data?: Record<string, unknown>;
}

export interface Meta {
  enviar(evento: EventoMeta): Promise<void>;
}

const PARAMETROS_PADRAO = new Set([
  "value", "currency", "content_ids", "content_type", "content_name",
  "content_category", "contents", "num_items", "order_id",
]);

export function customDataProduto(evento: NomeEventoMeta, orderId?: string): Record<string, unknown> | undefined {
  const valor = reais(PRODUTO_NOME.precoCentavos);
  const base = { value: valor, currency: PRODUTO_NOME.moeda, content_ids: [PRODUTO_NOME.codigo] };
  const itens = [{ id: PRODUTO_NOME.codigo, quantity: 1, item_price: valor }];
  switch (evento) {
    case "PageView":
      return undefined;
    case "ViewContent":
    case "AddToCart":
      return { ...base, content_type: "product", content_name: PRODUTO_NOME.nome };
    case "AddToWishlist":
      return { content_ids: [PRODUTO_CASAL_ID], content_name: "Compatibilidade do Casal" };
    case "InitiateCheckout":
      return { ...base, contents: itens, num_items: 1 };
    case "AddPaymentInfo":
      return base;
    case "Purchase":
      return { ...base, contents: itens, num_items: 1, order_id: orderId, content_type: "product" };
  }
}

/** Remove qualquer campo fora da lista de parâmetros padrão (defesa contra regressão). */
export function soParametrosPadrao(cd: Record<string, unknown> | undefined) {
  if (!cd) return undefined;
  return Object.fromEntries(Object.entries(cd).filter(([k, v]) => PARAMETROS_PADRAO.has(k) && v !== undefined));
}

export function limparUsuario(u: DadosUsuario): DadosUsuario {
  return Object.fromEntries(Object.entries(u).filter(([, v]) => typeof v === "string" && v.length > 0 && v.length < 512));
}

export class MetaCapi implements Meta {
  constructor(
    private readonly pixelId: string | undefined,
    private readonly token: string | undefined,
    private readonly versao: string,
    private readonly testEventCode: string | undefined,
    private readonly fetcher: typeof fetch = fetch,
    private readonly esperar: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
  ) {}

  async enviar(evento: EventoMeta): Promise<void> {
    if (!this.pixelId || !this.token) return; // desligado (ex.: desenvolvimento sem Pixel)
    const corpo: Record<string, unknown> = {
      data: [{ ...evento, user_data: limparUsuario(evento.user_data), custom_data: soParametrosPadrao(evento.custom_data) }],
    };
    if (this.testEventCode) corpo.test_event_code = this.testEventCode;
    const url = `https://graph.facebook.com/${this.versao}/${this.pixelId}/events?access_token=${encodeURIComponent(this.token)}`;
    for (let tentativa = 0; tentativa < 4; tentativa++) {
      try {
        const r = await this.fetcher(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(corpo) });
        if (r.ok) return;
        if (r.status >= 400 && r.status < 500 && r.status !== 429) {
          console.warn(`CAPI ${evento.event_name} recusado: HTTP ${r.status}`);
          return;
        }
      } catch {
        // rede: tenta de novo
      }
      if (tentativa < 3) await this.esperar(300 * 2 ** tentativa);
    }
    console.warn(`CAPI ${evento.event_name} falhou depois de 4 tentativas`);
  }
}

const ROBOS = /facebookexternalhit|facebot|whatsapp|telegrambot|twitterbot|slackbot|discordbot|linkedinbot|googlebot|bingbot|embedly|pinterest|skypeuripreview|bot\b|crawler|spider|preview/i;

export function ehRoboDePreVisualizacao(userAgent: string | null): boolean {
  return !userAgent || ROBOS.test(userAgent);
}
