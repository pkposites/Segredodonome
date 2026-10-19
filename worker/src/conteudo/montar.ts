// Montagem do resultado: escolhe e preenche os textos da biblioteca para um perfil.
// O completo só é montado pelas rotas depois de confirmar o pagamento no Mercado Pago.
import type { Perfil, Tratamento } from "../motor";
import { NOMES_TEMPERAMENTO } from "../motor/temperamento";
import type { BlocoComSemente } from "../motor/semente";
import { substituir, usaVariavelDeRepeticao } from "../motor/variaveis";
import type { Biblioteca, Redacao, Texto } from "./tipos";

export interface ResultadoGratis {
  primeiro_nome: string;
  arquetipo: { numero: number; nome: string; palavras_guia: string[] };
  inicial: string;
  temperamento: {
    id: string;
    nome: string;
    frase_resposta: string;
    placar: { acao: number; reflexao: number; emocao: number; razao: number };
  };
  essencia: string[];
  caracteristicas: string[];
  como_chegamos: string;
}

export type SecaoPagaId =
  | "forca_inicial"
  | "o_que_busca"
  | "como_te_enxergam"
  | "como_ama"
  | "dinheiro_trabalho"
  | "ponto_cego"
  | "seu_2027";

export interface SecaoPaga {
  id: SecaoPagaId;
  titulo: string;
  paragrafos: string[];
  /** Só em "seu_2027": um texto por trimestre. */
  trimestres?: { rotulo: string; texto: string }[];
}

export interface ResultadoCompleto {
  secoes: SecaoPaga[];
  frase_do_nome: string;
}

export interface Oferta {
  secoes: { id: SecaoPagaId; titulo: string; primeira_frase: string }[];
}

const TRIMESTRES = ["Janeiro a março", "Abril a junho", "Julho a setembro", "Outubro a dezembro"];

/** Artigos por tratamento: "a Bruna", "o Carlos", "Bruna". */
function artigos(t: Tratamento) {
  if (t === "ela") return { o: "a ", de: "da " };
  if (t === "ele") return { o: "o ", de: "do " };
  return { o: "", de: "de " };
}

export function titulosPagos(nome: string, inicial: string, t: Tratamento): Record<SecaoPagaId, string> {
  const a = artigos(t);
  return {
    forca_inicial: `A força da letra ${inicial}`,
    o_que_busca: `O que ${a.o}${nome} busca`,
    como_te_enxergam: `Como enxergam ${a.o}${nome}`,
    como_ama: `Como ${a.o}${nome} ama`,
    dinheiro_trabalho: `Dinheiro e trabalho ${a.de}${nome}`,
    ponto_cego: `O ponto cego ${a.de}${nome} e como virar o jogo`,
    seu_2027: `O 2027 ${a.de}${nome}, trimestre a trimestre`,
  };
}

/** Primeira frase de um parágrafo (até o primeiro . ! ? seguido de espaço ou fim). */
export function primeiraFrase(paragrafo: string): string {
  const m = paragrafo.match(/^.*?[.!?](?=\s|$)/s);
  return (m ? m[0] : paragrafo).trim();
}

class Montador {
  constructor(
    private readonly b: Biblioteca,
    private readonly p: Perfil,
  ) {}

  private texto(t: Texto): string {
    const bruto = typeof t === "string" ? t : t[this.p.tratamento];
    return substituir(bruto, this.p.variaveis);
  }

  private redacao(r: Redacao): string[] {
    return r.map((x) => this.texto(x));
  }

  /** Escolhe uma redação pela semente, pulando as de letra repetida quando o nome não tem. */
  private escolher(bloco: BlocoComSemente, opcoes: Redacao[]): Redacao {
    const validas = this.p.variaveis.repete
      ? opcoes
      : opcoes.filter((r) => !r.some((x) => (typeof x === "string" ? [x] : Object.values(x)).some(usaVariavelDeRepeticao)));
    return validas[this.p.semente.escolher(bloco, validas.length)]!;
  }

  private arquetipo(numero: number) {
    const a = this.b.arquetipos[numero];
    if (!a) throw new Error(`Arquétipo ${numero} ausente na biblioteca ${this.b.versao}`);
    return a;
  }

  gratis(): ResultadoGratis {
    const { numeros, temperamento: t } = this.p;
    const a = this.arquetipo(numeros.expressao);
    const c = this.b.comum;
    const conjuntos = a.do_arquetipo.caracteristicas;
    const caracteristicas = conjuntos[this.p.semente.escolher("caracteristicas", conjuntos.length)]!;
    return {
      primeiro_nome: this.p.variaveis.primeiro_nome,
      arquetipo: { numero: numeros.expressao, nome: a.arquetipo.nome, palavras_guia: a.arquetipo.palavras_guia },
      inicial: this.p.variaveis.inicial,
      temperamento: {
        id: t.id,
        nome: NOMES_TEMPERAMENTO[t.id],
        frase_resposta: this.texto(c.frases_temperamento[t.id][t.eixoCitado][t.opcaoCitada]!),
        placar: t.placar,
      },
      essencia: this.redacao(this.escolher("essencia", a.do_arquetipo.essencia[t.id])),
      caracteristicas: caracteristicas.map((x) => this.texto(x)),
      como_chegamos: this.texto(c.como_chegamos[this.p.semente.escolher("como_chegamos", c.como_chegamos.length)]!),
    };
  }

  completo(): ResultadoCompleto {
    const { numeros, temperamento: t, variaveis: v } = this.p;
    const da = this.arquetipo(numeros.expressao).do_arquetipo;
    const titulos = titulosPagos(v.primeiro_nome, v.inicial, this.p.tratamento);
    const ciclo = this.b.comum.ciclo_2027[String(numeros.ciclo2027)]!;
    const trimestres = ciclo.map((x, i) => ({ rotulo: TRIMESTRES[i]!, texto: this.texto(x) }));

    const secoes: SecaoPaga[] = [
      { id: "forca_inicial", titulo: titulos.forca_inicial, paragrafos: this.redacao(this.b.comum.iniciais[numeros.inicial]!) },
      {
        id: "o_que_busca",
        titulo: titulos.o_que_busca,
        paragrafos: this.redacao(this.escolher("coracao", this.arquetipo(numeros.coracao).do_numero.coracao)),
      },
      {
        id: "como_te_enxergam",
        titulo: titulos.como_te_enxergam,
        paragrafos: this.redacao(this.escolher("imagem", this.arquetipo(numeros.imagem).do_numero.imagem)),
      },
      { id: "como_ama", titulo: titulos.como_ama, paragrafos: this.redacao(da.como_ama[t.id]) },
      { id: "dinheiro_trabalho", titulo: titulos.dinheiro_trabalho, paragrafos: this.redacao(da.dinheiro_trabalho[t.id]) },
      {
        id: "ponto_cego",
        titulo: titulos.ponto_cego,
        paragrafos: this.redacao(this.escolher("ponto_cego", this.arquetipo(numeros.caminho).do_numero.ponto_cego)),
      },
      { id: "seu_2027", titulo: titulos.seu_2027, paragrafos: [], trimestres },
    ];
    return { secoes, frase_do_nome: this.texto(da.frase_do_nome[t.id]) };
  }
}

export function montarGratis(b: Biblioteca, p: Perfil): ResultadoGratis {
  return new Montador(b, p).gratis();
}

export function montarCompleto(b: Biblioteca, p: Perfil): ResultadoCompleto {
  return new Montador(b, p).completo();
}

/** Títulos + primeira frase real de cada seção paga (o resto nunca sai do Worker antes do pagamento). */
export function montarOferta(b: Biblioteca, p: Perfil): Oferta {
  const completo = montarCompleto(b, p);
  return {
    secoes: completo.secoes.map((s) => ({
      id: s.id,
      titulo: s.titulo,
      primeira_frase: primeiraFrase(s.paragrafos[0] ?? s.trimestres?.[0]?.texto ?? ""),
    })),
  };
}
