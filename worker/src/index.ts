import { tratar } from "./app";
import { BancoD1 } from "./banco";
import type { Env } from "./env";
import { garantirEsquema, limparSeNovoDia } from "./esquema";
import { completarEnv } from "./padroes";
import { criarServicos } from "./servicos";

export default {
  async fetch(req: Request, bruto: Env, ctx: ExecutionContext): Promise<Response> {
    const env = completarEnv(bruto);
    if (env.DB) {
      try {
        await garantirEsquema(env.DB);
        const limpeza = limparSeNovoDia(env.DB, new Date());
        if (limpeza) ctx.waitUntil(limpeza.catch((e) => console.warn("limpeza falhou:", String(e))));
      } catch (e) {
        console.error("banco indisponível:", String(e));
      }
    } else {
      console.warn("binding DB ausente: sem registro de acesso nem contadores");
    }
    return tratar(req, criarServicos(env, ctx), env.LIMITE);
  },

  // Opcional (só se houver cron cadastrado): apaga access_logs > 6 meses e pagamentos_contados > 7 dias.
  async scheduled(_c: ScheduledController, bruto: Env): Promise<void> {
    const env = completarEnv(bruto);
    if (env.DB) await new BancoD1(env.DB).limpar(new Date());
  },
} satisfies ExportedHandler<Env>;
