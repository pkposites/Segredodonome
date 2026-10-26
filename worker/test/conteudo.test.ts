import { describe, expect, it } from "vitest";
import { biblioteca, todasAsVersoes } from "../src/conteudo/biblioteca";
import { validarBiblioteca } from "../src/conteudo/validar";
import { montarCompleto, montarGratis, montarOferta, primeiraFrase } from "../src/conteudo/montar";
import { calcularPerfil, type Entradas } from "../src/motor";
import { entradasAleatorias, gerador } from "./fixtures";

const SEGREDO = "segredo-de-teste";

describe("biblioteca", () => {
  it.each(todasAsVersoes())("versão %s: nenhuma combinação faltando", (versao) => {
    const { erros } = validarBiblioteca(biblioteca(versao)!);
    expect(erros).toEqual([]);
  });

  it("validador acusa arquivo e variável faltando", () => {
    const b = structuredClone(biblioteca()!);
    delete b.arquetipos[3];
    b.comum.como_chegamos[0] = "Olá {apelido}";
    const { erros } = validarBiblioteca(b);
    expect(erros).toContain("arquetipo-3.json: arquivo ausente");
    expect(erros.some((e) => e.includes("{apelido}"))).toBe(true);
  });

  it("validador exige alternativa sem letra repetida", () => {
    const b = structuredClone(biblioteca()!);
    b.arquetipos[7]!.do_numero.coracao = [0, 1, 2].map(() => ["A letra {letra_mais_repetida} manda."]);
    expect(validarBiblioteca(b).erros.some((e) => e.includes("nomes sem letra repetida"))).toBe(true);
  });
});

describe("montagem", () => {
  const camila: Entradas = { nome: "Camila Costa", data_nascimento: "1994-03-17", tratamento: "ela", respostas: [2, 2, 2, 0, 3] };

  it("grátis de Camila Costa: O Farol, magnético, texto preenchido", async () => {
    const g = montarGratis(biblioteca()!, await calcularPerfil(camila, SEGREDO));
    expect(g.arquetipo).toEqual({ numero: 7, nome: "O Farol", palavras_guia: ["silêncio", "análise", "verdade"] });
    expect(g.primeiro_nome).toBe("Camila");
    expect(g.inicial).toBe("C");
    expect(g.temperamento.id).toBe("magnetico");
    expect(g.essencia).toHaveLength(2);
    expect(g.caracteristicas).toHaveLength(3);
    expect(JSON.stringify(g)).not.toMatch(/\{[a-z_]+\}/);
  });

  it("títulos pagos seguem o tratamento", async () => {
    const titulo = async (tratamento: Entradas["tratamento"]) =>
      montarOferta(biblioteca()!, await calcularPerfil({ ...camila, tratamento }, SEGREDO)).secoes.find((s) => s.id === "como_ama")!.titulo;
    expect(await titulo("ela")).toBe("Como a Camila ama");
    expect(await titulo("ele")).toBe("Como o Camila ama");
    expect(await titulo("neutro")).toBe("Como Camila ama");
  });

  it("oferta traz a primeira frase real de cada seção paga", async () => {
    const p = await calcularPerfil(camila, SEGREDO);
    const oferta = montarOferta(biblioteca()!, p);
    const completo = montarCompleto(biblioteca()!, p);
    expect(oferta.secoes).toHaveLength(7);
    for (const s of oferta.secoes) {
      const c = completo.secoes.find((x) => x.id === s.id)!;
      const primeiro = c.paragrafos[0] ?? c.trimestres![0]!.texto;
      expect(primeiro.startsWith(s.primeira_frase)).toBe(true);
      expect(s.primeira_frase.length).toBeLessThan(primeiro.length);
    }
  });

  it("1.000 entradas: determinístico, sem variável sobrando, todo bloco presente", async () => {
    const rnd = gerador(42);
    for (let i = 0; i < 1000; i++) {
      const e = entradasAleatorias(rnd);
      const [p1, p2] = [await calcularPerfil(e, SEGREDO), await calcularPerfil(e, SEGREDO)];
      const r1 = { g: montarGratis(biblioteca()!, p1), c: montarCompleto(biblioteca()!, p1) };
      const r2 = { g: montarGratis(biblioteca()!, p2), c: montarCompleto(biblioteca()!, p2) };
      expect(r2).toEqual(r1);
      const json = JSON.stringify(r1);
      expect(json).not.toMatch(/\{[a-z_]+\}/);
      expect(json).not.toContain(e.data_nascimento);
      expect(r1.c.secoes.every((s) => s.paragrafos.length > 0 || s.trimestres?.length === 4)).toBe(true);
    }
  });

  it("nome sem letra repetida nunca recebe texto de letra repetida", async () => {
    const e: Entradas = { nome: "Bruno Lima", data_nascimento: "1990-06-10", tratamento: "ele", respostas: [0, 0, 0, 0, 0] };
    const p = await calcularPerfil(e, SEGREDO);
    expect(p.variaveis.repete).toBe(false);
    const json = JSON.stringify([montarGratis(biblioteca()!, p), montarCompleto(biblioteca()!, p)]);
    expect(json).not.toMatch(/se repete 1 vez|aparece 1 vez/);
  });
});

describe("primeiraFrase", () => {
  it("corta no primeiro ponto final, de exclamação ou de interrogação", () => {
    expect(primeiraFrase("Uma frase. Outra.")).toBe("Uma frase.");
    expect(primeiraFrase("Será? Sim.")).toBe("Será?");
    expect(primeiraFrase("Sem ponto")).toBe("Sem ponto");
  });
});

describe("bônus Compatibilidade do casal", () => {
  it("nomes das cartas iguais aos da biblioteca e todas as 81 combinações com texto", async () => {
    const { NOMES_CARTAS, montarCasal } = await import("../src/conteudo/casal");
    const { normalizarNome } = await import("../src/motor/normalizar");
    const b = biblioteca()!;
    for (let n = 1; n <= 9; n++) expect(NOMES_CARTAS[n as 1]).toBe(b.arquetipos[n]!.arquetipo.nome);
    // Um nome por carta (expressão 1–9): letras "a" repetidas somam 1 cada.
    const porCarta = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => normalizarNome("a".repeat(n === 1 ? 10 : n))!);
    const vistos = new Set<string>();
    for (const x of porCarta) {
      for (const y of porCarta) {
        const c = montarCasal({ nome: x, data: "1990-05-12" }, { nome: y, data: "1988-11-30" });
        vistos.add(c.combinacao);
        for (const t of [c.voce.traz, c.voce.pede, c.parceria.traz, c.parceria.pede, c.sintonia.titulo, c.sintonia.texto, c.frase]) {
          expect(typeof t).toBe("string");
          expect(t.length).toBeGreaterThan(5);
          expect(t.toLowerCase()).not.toContain("numerologia");
        }
      }
    }
    expect(vistos.size).toBe(81);
  });
});
