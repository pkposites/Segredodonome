// Validação da biblioteca de textos. Erros = combinação faltando ou texto que quebraria
// na tela; o build e os testes falham. Avisos = regras editoriais de tamanho (GUIA, 1).
import { NOMES_VARIAVEIS, VARIAVEIS_DE_REPETICAO, usaVariavelDeRepeticao } from "../motor/variaveis";
import type { ArquivoArquetipo, ArquivoComum, Biblioteca, Redacao, Texto } from "./tipos";

const TEMPERAMENTOS = ["intenso", "estrategico", "sereno", "magnetico"] as const;
const EIXOS = ["acao_reflexao", "emocao_razao"] as const;
const LETRAS = "abcdefghijklmnopqrstuvwxyz".split("");
const PALAVRAS_PROIBIDAS = ["numerologia", "energia vibracional", "universo conspira", "carma", "signo", "mapa astral"];

export interface Relatorio {
  erros: string[];
  avisos: string[];
}

function formas(t: Texto): string[] {
  return typeof t === "string" ? [t] : [t.ela, t.ele, t.neutro];
}

function tamanho(r: Redacao): number {
  return r.reduce((s, p) => s + formas(p)[0]!.length, 0);
}

class Validador {
  erros: string[] = [];
  avisos: string[] = [];

  texto(onde: string, t: unknown, permiteRepeticao = true) {
    if (typeof t === "object" && t !== null && !Array.isArray(t)) {
      const o = t as Record<string, unknown>;
      for (const f of ["ela", "ele", "neutro"]) {
        if (typeof o[f] !== "string") this.erros.push(`${onde}: falta a forma "${f}"`);
      }
      if (this.erros.length) return;
    } else if (typeof t !== "string") {
      this.erros.push(`${onde}: texto ausente`);
      return;
    }
    for (const s of formas(t as Texto)) {
      if (s.trim().length === 0) this.erros.push(`${onde}: texto vazio`);
      for (const [, nome] of s.matchAll(/\{([^}]*)\}/g)) {
        if (!NOMES_VARIAVEIS.includes(nome as never)) this.erros.push(`${onde}: variável desconhecida {${nome}}`);
      }
      if (!permiteRepeticao && usaVariavelDeRepeticao(s)) {
        this.erros.push(`${onde}: bloco sem alternativa não pode usar ${VARIAVEIS_DE_REPETICAO.join("/")}`);
      }
      const baixo = s.toLowerCase();
      for (const p of PALAVRAS_PROIBIDAS) if (baixo.includes(p)) this.erros.push(`${onde}: termo proibido "${p}"`);
    }
  }

  redacao(onde: string, r: unknown, permiteRepeticao = true): r is Redacao {
    if (!Array.isArray(r) || r.length === 0) {
      this.erros.push(`${onde}: redação ausente`);
      return false;
    }
    r.forEach((p, i) => this.texto(`${onde}[${i}]`, p, permiteRepeticao));
    return true;
  }

  /** Blocos com redações alternativas: precisa de pelo menos uma sem variável de repetição. */
  alternativas(onde: string, lista: unknown, quantidade: number) {
    if (!Array.isArray(lista) || lista.length !== quantidade) {
      this.erros.push(`${onde}: esperadas ${quantidade} redações`);
      return;
    }
    lista.forEach((r, i) => this.redacao(`${onde}[${i}]`, r));
    const semRepeticao = lista.filter(
      (r) => Array.isArray(r) && !r.some((p: Texto) => formas(p).some(usaVariavelDeRepeticao)),
    );
    if (semRepeticao.length === 0) {
      this.erros.push(`${onde}: toda redação usa letra repetida; nomes sem letra repetida ficariam sem texto`);
    }
  }

  tamanhoPago(onde: string, r: Redacao) {
    const n = tamanho(r);
    if (n < 700 || n > 1100) this.avisos.push(`${onde}: ${n} caracteres (guia: 700–1.100)`);
  }
}

function validarArquetipo(v: Validador, n: number, a: ArquivoArquetipo | undefined, versao: string) {
  const base = `arquetipo-${n}`;
  if (!a) {
    v.erros.push(`${base}.json: arquivo ausente`);
    return;
  }
  if (a.numero !== n) v.erros.push(`${base}: numero = ${a.numero}`);
  if (a.content_version !== versao) v.erros.push(`${base}: content_version ${a.content_version} ≠ ${versao}`);
  if (!a.arquetipo?.nome) v.erros.push(`${base}: arquetipo.nome ausente`);

  const da = a.do_arquetipo;
  if (!da) {
    v.erros.push(`${base}: do_arquetipo ausente`);
  } else {
    for (const t of TEMPERAMENTOS) {
      v.alternativas(`${base}.essencia.${t}`, da.essencia?.[t], 3);
      da.essencia?.[t]?.forEach((r, i) =>
        r.forEach((p, j) => {
          const len = formas(p)[0]!.length;
          if (len < 220 || len > 550) v.avisos.push(`${base}.essencia.${t}[${i}][${j}]: ${len} caracteres (guia: 220–550)`);
        }),
      );
      if (da.essencia?.[t]?.some((r) => r.length !== 2)) v.erros.push(`${base}.essencia.${t}: cada redação tem 2 parágrafos`);
      if (v.redacao(`${base}.como_ama.${t}`, da.como_ama?.[t], false)) v.tamanhoPago(`${base}.como_ama.${t}`, da.como_ama[t]);
      if (v.redacao(`${base}.dinheiro_trabalho.${t}`, da.dinheiro_trabalho?.[t], false)) {
        v.tamanhoPago(`${base}.dinheiro_trabalho.${t}`, da.dinheiro_trabalho[t]);
      }
      v.texto(`${base}.frase_do_nome.${t}`, da.frase_do_nome?.[t], false);
      const frase = da.frase_do_nome?.[t];
      if (frase && formas(frase).some((s) => s.length > 110)) v.avisos.push(`${base}.frase_do_nome.${t}: mais de 110 caracteres`);
    }
    if (!Array.isArray(da.caracteristicas) || da.caracteristicas.length !== 3) {
      v.erros.push(`${base}.caracteristicas: esperados 3 conjuntos`);
    } else {
      da.caracteristicas.forEach((c, i) => {
        if (!Array.isArray(c) || c.length !== 3) v.erros.push(`${base}.caracteristicas[${i}]: esperadas 3`);
        else c.forEach((x, j) => {
          v.texto(`${base}.caracteristicas[${i}][${j}]`, x, false);
          if (formas(x).some((s) => s.length > 40)) v.avisos.push(`${base}.caracteristicas[${i}][${j}]: mais de 40 caracteres`);
        });
      });
    }
  }

  for (const bloco of ["coracao", "imagem", "ponto_cego"] as const) {
    v.alternativas(`${base}.do_numero.${bloco}`, a.do_numero?.[bloco], 3);
    a.do_numero?.[bloco]?.forEach((r, i) => v.tamanhoPago(`${base}.do_numero.${bloco}[${i}]`, r));
    if (a.do_numero?.[bloco]?.some((r) => formas(r[0]!).some((s) => /O Farol|A Chama|A Ponte|A Voz|A Raiz|O Vento|O Abrigo|O Leme|O Horizonte/.test(s)))) {
      v.erros.push(`${base}.do_numero.${bloco}: não pode citar nome de arquétipo`);
    }
  }
}

function validarComum(v: Validador, c: ArquivoComum | undefined, versao: string) {
  if (!c) {
    v.erros.push("comum.json: arquivo ausente");
    return;
  }
  if (c.content_version !== versao) v.erros.push(`comum: content_version ${c.content_version} ≠ ${versao}`);
  for (const l of LETRAS) {
    if (v.redacao(`comum.iniciais.${l}`, c.iniciais?.[l], false)) v.tamanhoPago(`comum.iniciais.${l}`, c.iniciais[l]!);
  }
  for (let n = 1; n <= 9; n++) {
    const tri = c.ciclo_2027?.[String(n)];
    if (!Array.isArray(tri) || tri.length !== 4) v.erros.push(`comum.ciclo_2027.${n}: esperados 4 trimestres`);
    else tri.forEach((t, i) => v.texto(`comum.ciclo_2027.${n}[${i}]`, t, false));
  }
  for (const t of TEMPERAMENTOS) {
    for (const e of EIXOS) {
      const lista = c.frases_temperamento?.[t]?.[e];
      if (!Array.isArray(lista) || lista.length !== 4) v.erros.push(`comum.frases_temperamento.${t}.${e}: esperadas 4`);
      else lista.forEach((x, i) => v.texto(`comum.frases_temperamento.${t}.${e}[${i}]`, x, false));
    }
  }
  if (!Array.isArray(c.como_chegamos) || c.como_chegamos.length !== 3) v.erros.push("comum.como_chegamos: esperadas 3");
  else c.como_chegamos.forEach((x, i) => v.texto(`comum.como_chegamos[${i}]`, x, false));
  if (!Array.isArray(c.micro_revelacoes) || c.micro_revelacoes.length < 2) v.erros.push("comum.micro_revelacoes: esperadas ao menos 2");
  // O front escolhe a micro-revelação e pula as de letra repetida quando o nome não tem.
  else c.micro_revelacoes.forEach((x, i) => v.texto(`comum.micro_revelacoes[${i}]`, x));
}

export function validarBiblioteca(b: Biblioteca): Relatorio {
  const v = new Validador();
  for (let n = 1; n <= 9; n++) validarArquetipo(v, n, b.arquetipos[n], b.versao);
  validarComum(v, b.comum, b.versao);
  return { erros: v.erros, avisos: v.avisos };
}
