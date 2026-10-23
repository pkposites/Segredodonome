// /admin/* (worker/API.md). Só depois de autorizarAdmin.
import { z } from "zod";
import { ETAPAS, normalizarCampanha, normalizarVariante, type Banco, type Config, type Etapa } from "../banco";
import { centavos, PRODUTO_NOME } from "../catalogo";
import { ErroHttp, json, lerJson } from "../http";
import { PREFIXO_REFERENCIA } from "../motor/semente";
import type { Servicos } from "../servicos";
import { adicionarAparelho, lerEstado, notificar, removerAparelho } from "../notificacoes";
import { endpointValido } from "../push";

const dia = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const MINIMO_VENDAS_CONFIAVEL = 30;

const FUNIL: { etapa: Etapa; rotulo: string }[] = [
  { etapa: "visita", rotulo: "Visitas" },
  { etapa: "quiz_inicio", rotulo: "Iniciaram o quiz" },
  { etapa: "quiz_metade", rotulo: "Chegaram na metade" },
  { etapa: "resultado_visto", rotulo: "Viram o resultado" },
  { etapa: "comprar_toque", rotulo: "Tocaram em comprar" },
  { etapa: "pix_gerado", rotulo: "Geraram Pix" },
  { etapa: "pix_pago", rotulo: "Pagaram" },
];

function periodo(url: URL) {
  const de = dia.safeParse(url.searchParams.get("de"));
  const ate = dia.safeParse(url.searchParams.get("ate"));
  if (!de.success || !ate.success || de.data > ate.data) throw new ErroHttp(400, "periodo_invalido", "Período inválido.");
  return { de: de.data, ate: ate.data };
}

export interface Painel {
  periodo: { de: string; ate: string; utm_campaign: string | null; variante: string | null };
  /** Etapas concluídas do quiz (1–9), para ver onde as pessoas desistem. */
  quiz_etapas: { passo: number; total: number; pct_inicio: number | null }[];
  funil: { etapa: Etapa; rotulo: string; total: number; pct_anterior: number | null; pct_visitas: number | null; custo_cents: number | null }[];
  extras: Record<Etapa, number>;
  gasto_cents: number;
  vendas: number;
  receita_bruta_cents: number;
  taxa_cents: number;
  imposto_cents: number;
  receita_liquida_cents: number;
  lucro_cents: number;
  roas: number | null;
  custo_por_venda_cents: number | null;
  dados_insuficientes: boolean;
  config: Config;
}

export async function calcularPainel(banco: Banco, de: string, ate: string, utm: string | null, variante: string | null = null): Promise<Painel> {
  const [cont, gastos, config] = await Promise.all([
    banco.contadores(de, ate, utm ?? undefined, variante ?? undefined),
    banco.gastos(de, ate),
    banco.lerConfig(),
  ]);
  // Com filtro de campanha, usa o gasto daquela campanha; sem filtro, soma tudo.
  const gasto = gastos.filter((g) => !utm || g.campanha === utm).reduce((s, g) => s + g.gasto_cents, 0);
  const visitas = cont.visita;
  const funil = FUNIL.map((f, i) => {
    const total = cont[f.etapa];
    const anterior = i > 0 ? cont[FUNIL[i - 1]!.etapa] : null;
    return {
      ...f,
      total,
      pct_anterior: anterior ? total / anterior : null,
      pct_visitas: visitas ? total / visitas : null,
      custo_cents: total ? Math.round(gasto / total) : null,
    };
  });
  const vendas = cont.pix_pago;
  const bruta = vendas * PRODUTO_NOME.precoCentavos;
  const taxa = Math.round((bruta * config.taxa_pix_pct) / 100);
  const imposto = Math.round((bruta * config.imposto_pct) / 100);
  const liquida = bruta - taxa - imposto;
  return {
    periodo: { de, ate, utm_campaign: utm, variante },
    quiz_etapas: [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
      const total = cont[`quiz_passo_${n}` as Etapa];
      return { passo: n, total, pct_inicio: cont.quiz_inicio ? total / cont.quiz_inicio : null };
    }),
    funil,
    extras: cont,
    gasto_cents: gasto,
    vendas,
    receita_bruta_cents: bruta,
    taxa_cents: taxa,
    imposto_cents: imposto,
    receita_liquida_cents: liquida,
    lucro_cents: liquida - gasto,
    roas: gasto ? bruta / gasto : null,
    custo_por_venda_cents: vendas ? Math.round(gasto / vendas) : null,
    dados_insuficientes: vendas < MINIMO_VENDAS_CONFIAVEL,
    config,
  };
}

const taxa = (a: number, b: number) => (b ? a / b : null);

/** Comparação de versões da experiência: conclusão do quiz, oferta vista e conversão. */
export function compararVariantes(dados: Record<string, Record<Etapa, number>>) {
  return Object.entries(dados)
    .map(([variante, c]) => ({
      variante,
      visitas: c.visita,
      iniciaram: c.quiz_inicio,
      concluiram_quiz: c.quiz_passo_9,
      viram_resultado: c.resultado_visto,
      viram_oferta: c.oferta_vista,
      geraram_pix: c.pix_gerado,
      pagaram: c.pix_pago,
      taxa_conclusao: taxa(c.quiz_passo_9, c.quiz_inicio),
      taxa_oferta: taxa(c.oferta_vista, c.resultado_visto),
      taxa_compra: taxa(c.pix_pago, c.resultado_visto),
      dados_insuficientes: c.pix_pago < MINIMO_VENDAS_CONFIAVEL,
    }))
    .sort((a, b) => a.variante.localeCompare(b.variante));
}

const esquemaGasto = z.object({ dia, campanha: z.string().optional(), gasto_cents: z.number().int().min(0).max(100_000_000) });
const esquemaConfig = z.object({ taxa_pix_pct: z.number().min(0).max(100), imposto_pct: z.number().min(0).max(100) });

export async function rotaAdmin(req: Request, s: Servicos, caminho: string): Promise<Response> {
  const url = new URL(req.url);
  if (caminho === "/admin/painel" && req.method === "GET") {
    const { de, ate } = periodo(url);
    const utm = url.searchParams.get("utm_campaign");
    const variante = url.searchParams.get("variante");
    return json(await calcularPainel(s.banco, de, ate, utm ? normalizarCampanha(utm) : null, variante ? normalizarVariante(variante) : null));
  }
  if (caminho === "/admin/variantes" && req.method === "GET") {
    const { de, ate } = periodo(url);
    return json({ variantes: compararVariantes(await s.banco.porVariante(de, ate)) });
  }
  if (caminho === "/admin/vendas-mp" && req.method === "GET") {
    const { de, ate } = periodo(url);
    const inicio = new Date(`${de}T00:00:00-03:00`);
    const fim = new Date(`${ate}T23:59:59-03:00`);
    const lista = await s.mp.buscarAprovadosNoPeriodo(inicio, fim);
    const nossas = lista.filter(
      (p) => (p.external_reference ?? "").startsWith(PREFIXO_REFERENCIA) && centavos(p.valor) === PRODUTO_NOME.precoCentavos,
    );
    return json({
      vendas: nossas.length,
      reembolsadas: nossas.filter((p) => p.valor_reembolsado > 0).length,
      receita_bruta_cents: nossas.length * PRODUTO_NOME.precoCentavos,
    });
  }
  if (caminho === "/admin/gasto") {
    if (req.method === "GET") {
      const { de, ate } = periodo(url);
      return json({ gastos: await s.banco.gastos(de, ate) });
    }
    if (req.method === "PUT") {
      const g = esquemaGasto.safeParse(await lerJson(req));
      if (!g.success) throw new ErroHttp(400, "gasto_invalido", "Confira o dia e o valor.");
      const campanha = g.data.campanha ? normalizarCampanha(g.data.campanha) : "(total)";
      await s.banco.salvarGasto(g.data.dia, campanha === "(sem)" ? "(total)" : campanha, g.data.gasto_cents, s.agora());
      return json({ ok: true });
    }
  }
  if (caminho === "/admin/config") {
    if (req.method === "GET") return json(await s.banco.lerConfig());
    if (req.method === "PUT") {
      const c = esquemaConfig.safeParse(await lerJson(req));
      if (!c.success) throw new ErroHttp(400, "config_invalida", "Percentuais entre 0 e 100.");
      await s.banco.salvarConfig(c.data);
      return json({ ok: true });
    }
  }
  if (caminho === "/admin/push") {
    if (req.method === "GET") {
      const e = await lerEstado(s.banco);
      return json({ chave_publica: s.push.chavePublica(), aparelhos: e.aparelhos.length });
    }
    if (req.method === "POST" || req.method === "DELETE") {
      const corpo = (await lerJson(req)) as { endpoint?: unknown } | null;
      if (!endpointValido(corpo?.endpoint)) throw new ErroHttp(400, "aparelho_invalido", "Endereço de notificação inválido.");
      const aparelhos = req.method === "POST" ? await adicionarAparelho(s.banco, corpo.endpoint) : await removerAparelho(s.banco, corpo.endpoint);
      return json({ aparelhos });
    }
  }
  if (caminho === "/admin/push/teste" && req.method === "POST") {
    if (!s.push.ligado()) throw new ErroHttp(409, "sem_chave", "Cadastre a chave VAPID_PRIVADA na Cloudflare primeiro.");
    return json(await notificar(s, "🔔 Teste do Segredo do Nome", "Os avisos de venda estão funcionando."));
  }
  if (caminho === "/admin/push/mensagem" && req.method === "GET") {
    return json({ mensagem: (await lerEstado(s.banco)).mensagem ?? null });
  }
  throw new ErroHttp(404, "nao_encontrado", "Rota não encontrada.");
}

export { ETAPAS };
