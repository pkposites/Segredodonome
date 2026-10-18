import { tratar } from "./app";
import { BancoD1 } from "./banco";
import type { Env } from "./env";
import { criarServicos } from "./servicos";

export default {
  fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return tratar(req, criarServicos(env, ctx), env.LIMITE);
  },

  // Diário (wrangler.toml): apaga access_logs > 6 meses e pagamentos_contados > 7 dias.
  async scheduled(_c: ScheduledController, env: Env): Promise<void> {
    await new BancoD1(env.DB).limpar(new Date());
  },
} satisfies ExportedHandler<Env>;
