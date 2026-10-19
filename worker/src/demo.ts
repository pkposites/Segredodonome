// MODO DEMONSTRAÇÃO (só para a prévia no Netlify, nunca para produção).
// Roda no navegador e imita as rotas públicas do Worker com o motor e a biblioteca reais.
// Não há pagamento: o "Pix" é aprovado sozinho alguns segundos depois de gerado.
// ATENÇÃO: este pacote contém os textos pagos. Ele é gerado por scripts/gerar-demo.mjs
// direto na pasta da prévia e não faz parte de web/.
import { biblioteca } from "./conteudo/biblioteca";
import { montarCompleto, montarGratis, montarOferta } from "./conteudo/montar";
import { ALGORITHM_VERSION, calcularPerfil, type Entradas } from "./motor";
import { validarEntradas } from "./entradas";
import { paraBase64url, deBase64url } from "./cripto/base64url";

const SEGREDO_DEMO = "segredo-somente-demonstracao";
const APROVA_EM_MS = 8000;

class ErroDemo extends Error {
  constructor(
    readonly status: number,
    readonly codigo: string,
    mensagem: string,
  ) {
    super(mensagem);
  }
}

async function resposta(entradas: Entradas, completo: boolean) {
  const b = biblioteca()!;
  const p = await calcularPerfil(entradas, SEGREDO_DEMO);
  return {
    gratis: montarGratis(b, p),
    oferta: completo ? null : { preco: 11.9, moeda: "BRL", secoes: montarOferta(b, p).secoes },
    completo: completo ? montarCompleto(b, p) : null,
    versoes: { algoritmo: ALGORITHM_VERSION, conteudo: b.versao },
  };
}

function exigir(bruto: unknown): Entradas {
  const v = validarEntradas(bruto, new Date());
  if (!v.ok) throw new ErroDemo(v.erro.erro === "idade" ? 403 : 400, v.erro.erro, v.erro.mensagem);
  return v.entradas;
}

// Na demonstração o "passe" é só as entradas em base64url, SEM criptografia.
const passeDemo = (e: Entradas, pagamentoId: string) =>
  paraBase64url(new TextEncoder().encode(JSON.stringify({ demo: 1, e, p: pagamentoId })));

function abrirPasseDemo(passe: string): { e: Entradas; p: string } | null {
  try {
    const d = JSON.parse(new TextDecoder().decode(deBase64url(passe)!));
    return d.demo === 1 ? d : null;
  } catch {
    return null;
  }
}

const pix = new Map<string, number>(); // pagamento_id → hora em que "aprova"

export async function post(caminho: string, corpo: any): Promise<unknown> {
  await new Promise((r) => setTimeout(r, 250));
  switch (caminho) {
    case "/resultado": {
      if (corpo?.passe) {
        const d = abrirPasseDemo(corpo.passe);
        if (!d) throw new ErroDemo(400, "passe_invalido", "Este link de acesso não é válido.");
        return resposta(d.e, true);
      }
      return resposta(exigir(corpo?.entradas), false);
    }
    case "/checkout": {
      exigir(corpo?.entradas);
      const id = String(Date.now()).slice(-9);
      pix.set(id, Date.now() + APROVA_EM_MS);
      return {
        pagamento_id: id,
        qr_code_base64: null,
        copia_e_cola: "DEMONSTRACAO-sem-valor-nao-pague",
        expira_em: new Date(Date.now() + 30 * 60_000).toISOString(),
        event_id_checkout: crypto.randomUUID(),
      };
    }
    case "/pagamento/status": {
      const e = exigir(corpo?.entradas);
      const aprova = pix.get(corpo?.pagamento_id);
      if (!aprova) throw new ErroDemo(404, "nao_encontrado", "Não encontramos este pagamento.");
      if (Date.now() < aprova) return { status: "pending" };
      const r = await resposta(e, true);
      return {
        status: "approved",
        passe: passeDemo(e, corpo.pagamento_id),
        comprovante: { pagamento_id: corpo.pagamento_id, data_hora: new Date().toISOString(), valor: 11.9, forma: "Pix" },
        gratis: r.gratis,
        completo: r.completo,
        versoes: r.versoes,
        event_id_purchase: `compra-${corpo.pagamento_id}`,
      };
    }
    case "/recuperar":
      throw new ErroDemo(404, "nao_encontrado", "Não encontramos este pagamento.");
    case "/evento":
      return null;
    default:
      throw new ErroDemo(404, "nao_encontrado", "Rota não encontrada.");
  }
}
