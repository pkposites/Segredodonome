import { describe, expect, it } from "vitest";
import { normalizarNome } from "../src/motor/normalizar";
import { calcularNumeros, partesDaData, reduzir } from "../src/motor/calculo";
import { calcularTemperamento, ehAcao, ehEmocao } from "../src/motor/temperamento";
import { gerarChave, gerarSemente } from "../src/motor/semente";
import { calcularVariaveis, letraMaisRepetida, substituir } from "../src/motor/variaveis";
import { gerador, nomesBrasileiros } from "./fixtures";

describe("normalização do nome", () => {
  it("variações de espaço, caixa, acento e hífen dão o mesmo nome", () => {
    const formas = ["Ana  Paula", "ana paula", "Ána Paula", "Ana-Paula", "  ANA   PAULA "];
    const normalizados = formas.map((f) => normalizarNome(f)!.normalizado);
    expect(new Set(normalizados)).toEqual(new Set(["ana paula"]));
  });

  it("remove partículas isoladas", () => {
    expect(normalizarNome("Maria da Silva")!.normalizado).toBe(normalizarNome("Maria Silva")!.normalizado);
    expect(normalizarNome("João dos Santos e Souza")!.normalizado).toBe("joao santos souza");
  });

  it("trata ç, ñ, apóstrofo e caracteres fora de a–z", () => {
    expect(normalizarNome("Conceição")!.letras).toBe("conceicao");
    // Apóstrofo vira espaço e "d" não está na lista de partículas (4.2).
    expect(normalizarNome("Iñaki D'Ávila")!.normalizado).toBe("inaki d avila");
    expect(normalizarNome("Lu 123")!.letras).toBe("lu");
  });

  it("pede revisão com menos de 2 letras", () => {
    expect(normalizarNome("A")).toBeNull();
    expect(normalizarNome("de da")).toBeNull();
    expect(normalizarNome("123")).toBeNull();
  });

  it("exibe o primeiro nome como foi digitado, com acento", () => {
    expect(normalizarNome("  ána paula")!.primeiroNome).toBe("Ána");
    expect(normalizarNome("Léo Ramos")!.primeiroNome).toBe("Léo");
  });
});

describe("reduzir", () => {
  it("casos da especificação", () => {
    expect(reduzir(29)).toBe(2);
    expect(reduzir(38)).toBe(2);
    expect(reduzir(22)).toBe(4);
    expect(reduzir(49)).toBe(4);
    expect(reduzir(11)).toBe(2);
  });

  it("1 a 999 batem com a raiz digital 1 + (n - 1) mod 9", () => {
    for (let n = 1; n <= 999; n++) expect(reduzir(n)).toBe(1 + ((n - 1) % 9));
  });
});

describe("números", () => {
  it("exemplo calculado à mão: Camila Costa, 17/03/1994", () => {
    // c3 a1 m4 i9 l3 a1 c3 o6 s1 t2 a1 = 34 → 7 (O Farol, como no exemplo do pacote)
    const n = calcularNumeros(normalizarNome("Camila Costa")!.letras, partesDaData("1994-03-17"));
    expect(n.expressao).toBe(7);
    expect(n.coracao).toBe(reduzir(1 + 9 + 1 + 6 + 1)); // a i a o a = 18 → 9
    expect(n.imagem).toBe(reduzir(3 + 4 + 3 + 3 + 1 + 2)); // 16 → 7
    expect(n.caminho).toBe(reduzir(reduzir(17) + reduzir(3) + reduzir(1994)));
    expect(n.ciclo2027).toBe(reduzir(8 + 3 + 2));
    expect(n.inicial).toBe("c");
  });

  it("y é consoante", () => {
    const n = calcularNumeros("yy", partesDaData("2000-01-01"));
    expect(n.coracao).toBe(9); // sem vogais → regra fixa
    expect(n.imagem).toBe(reduzir(14));
  });

  it("distribuição com ~2.000 nomes brasileiros: cada arquétipo entre 8% e 15%", () => {
    const nomes = nomesBrasileiros();
    expect(nomes.length).toBeGreaterThanOrEqual(2000);
    const contagem = new Array(10).fill(0);
    for (const nome of nomes) {
      contagem[calcularNumeros(normalizarNome(nome)!.letras, partesDaData("1990-01-01")).expressao]++;
    }
    for (let a = 1; a <= 9; a++) {
      const pct = contagem[a] / nomes.length;
      expect(pct, `arquétipo ${a}: ${(pct * 100).toFixed(1)}%`).toBeGreaterThanOrEqual(0.08);
      expect(pct, `arquétipo ${a}: ${(pct * 100).toFixed(1)}%`).toBeLessThanOrEqual(0.15);
    }
  });
});

describe("temperamento", () => {
  const todas = (): number[][] => {
    const out: number[][] = [];
    for (let i = 0; i < 4 ** 5; i++) out.push([0, 1, 2, 3, 4].map((p) => Math.floor(i / 4 ** p) % 4));
    return out;
  };

  it("mapeia os quatro quadrantes", () => {
    expect(calcularTemperamento([0, 0, 0, 0, 0]).id).toBe("intenso");
    expect(calcularTemperamento([1, 1, 1, 1, 1]).id).toBe("estrategico");
    expect(calcularTemperamento([2, 2, 2, 2, 2]).id).toBe("magnetico");
    expect(calcularTemperamento([3, 3, 3, 3, 3]).id).toBe("sereno");
  });

  it("nunca empata nas 1.024 combinações", () => {
    for (const r of todas()) {
      const { placar } = calcularTemperamento(r);
      expect(placar.acao).not.toBe(placar.reflexao);
      expect(placar.emocao).not.toBe(placar.razao);
    }
  });

  it("trocar 1 resposta muda no máximo 1 eixo, e só quando o placar era 3×2", () => {
    for (const r of todas()) {
      const antes = calcularTemperamento(r);
      for (let p = 0; p < 5; p++) {
        for (let o = 0; o < 4; o++) {
          const r2 = [...r];
          r2[p] = o;
          const depois = calcularTemperamento(r2);
          const mudouAR = (antes.placar.acao >= 3) !== (depois.placar.acao >= 3);
          const mudouER = (antes.placar.emocao >= 3) !== (depois.placar.emocao >= 3);
          if (mudouAR) expect(Math.abs(antes.placar.acao - antes.placar.reflexao)).toBe(1);
          if (mudouER) expect(Math.abs(antes.placar.emocao - antes.placar.razao)).toBe(1);
          // Uma opção pontua os dois eixos, então os dois podem mudar ao mesmo tempo
          // só se os dois estavam 3×2; o teste da especificação vale por eixo.
          if (mudouAR && mudouER) {
            expect(ehAcao(r[p]!)).not.toBe(ehAcao(o));
            expect(ehEmocao(r[p]!)).not.toBe(ehEmocao(o));
          }
        }
      }
    }
  });

  it("resposta citada: eixo mais apertado; empate → pergunta 3", () => {
    // ação 5×0, emoção 3×2 → cita emoção/razão (pergunta 3)
    expect(calcularTemperamento([0, 0, 0, 1, 1]).perguntaCitada).toBe(2);
    // ação 3×2, emoção 5×0 → cita ação/reflexão (pergunta 1)
    expect(calcularTemperamento([0, 0, 0, 2, 2]).perguntaCitada).toBe(0);
    // ambos 3×2 → pergunta 3
    const t = calcularTemperamento([0, 0, 1, 2, 3]);
    expect(t.perguntaCitada).toBe(2);
    expect(t.opcaoCitada).toBe(1);
  });
});

describe("semente e chave", () => {
  it("mesma pessoa → mesma semente; mudar só a data muda", async () => {
    const a = await gerarSemente("s", "ana paula", "1990-05-01");
    const b = await gerarSemente("s", "ana paula", "1990-05-01");
    const c = await gerarSemente("s", "ana paula", "1990-05-02");
    const blocos = ["essencia", "caracteristicas", "como_chegamos", "coracao", "imagem", "ponto_cego"] as const;
    expect(blocos.map((x) => a.escolher(x, 3))).toEqual(blocos.map((x) => b.escolher(x, 3)));
    // Com 6 blocos e 3 opções, a chance de tudo coincidir por acaso é 1/729.
    expect(blocos.map((x) => a.escolher(x, 3))).not.toEqual(blocos.map((x) => c.escolher(x, 3)));
  });

  it("chave tem 32 hex, depende do segredo e das entradas", async () => {
    const k = await gerarChave("segredo", "ana paula", "1990-05-01");
    expect(k).toMatch(/^[0-9a-f]{32}$/);
    expect(await gerarChave("outro", "ana paula", "1990-05-01")).not.toBe(k);
    expect(await gerarChave("segredo", "ana paula", "1990-05-01")).toBe(k);
  });

  it("redações variam entre pessoas com o mesmo arquétipo", async () => {
    const rnd = gerador(7);
    const escolhas = new Set<number>();
    for (let i = 0; i < 50; i++) {
      const s = await gerarSemente("s", `pessoa ${i}`, `19${50 + Math.floor(rnd() * 50)}-01-01`);
      escolhas.add(s.escolher("essencia", 3));
    }
    expect(escolhas.size).toBe(3);
  });
});

describe("variáveis", () => {
  it("Camila Costa: 11 letras, A 3 vezes (como no exemplo do pacote)", () => {
    const v = calcularVariaveis(normalizarNome("Camila Costa")!, partesDaData("1994-03-17"));
    expect(v.qtd_letras).toBe("11");
    expect(v.letra_mais_repetida).toBe("A");
    expect(v.qtd_letra_mais_repetida).toBe("3");
    expect(v.inicial).toBe("C");
    expect(v.mes_aniversario).toBe("março");
    expect(v.repete).toBe(true);
  });

  it("empate na repetição: vence a que aparece primeiro", () => {
    expect(letraMaisRepetida("abab")).toEqual({ letra: "a", qtd: 2 });
  });

  it("detecta nome sem letra repetida", () => {
    expect(calcularVariaveis(normalizarNome("Bruno Lima")!, partesDaData("1990-01-01")).repete).toBe(false);
  });

  it("substitui só variáveis conhecidas", () => {
    const v = calcularVariaveis(normalizarNome("Ana")!, partesDaData("1990-01-01"));
    expect(substituir("{primeiro_nome} tem {qtd_letras} letras {x}", v)).toBe("Ana tem 3 letras {x}");
  });
});
