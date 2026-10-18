import { describe, expect, it } from "vitest";
import { abrirPasse, emitirPasse, expiraEm, passeVencido, type ConteudoPasse } from "../src/cripto/passe";
import { deBase64url, paraBase64url } from "../src/cripto/base64url";

const conteudo: ConteudoPasse = {
  v: 1,
  nome: "Camila Costa",
  data: "1994-03-17",
  tratamento: "ela",
  respostas: [2, 2, 2, 0, 3],
  pagamento_id: "123",
  content_version: "2026-10-a",
  emitido_em: "2026-10-18T15:00:00.000Z",
  expira_em: "2027-10-18T15:00:00.000Z",
};
const chaves = { atual: 1, segredos: { 1: "segredo-um" } };

describe("passe", () => {
  it("ida e volta", async () => {
    const p = await emitirPasse(conteudo, chaves);
    expect(p).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(await abrirPasse(p, chaves)).toEqual(conteudo);
  });

  it("não deixa ler nada sem a chave", async () => {
    const p = await emitirPasse(conteudo, chaves);
    const bytes = new TextDecoder().decode(deBase64url(p)!);
    expect(bytes).not.toContain("Camila");
    expect(bytes).not.toContain("1994");
  });

  it("alterar qualquer byte invalida", async () => {
    const p = await emitirPasse(conteudo, chaves);
    const bytes = deBase64url(p)!;
    for (let i = 0; i < bytes.length; i++) {
      const alterado = bytes.slice();
      alterado[i] = alterado[i]! ^ 0x01;
      expect(await abrirPasse(paraBase64url(alterado), chaves), `byte ${i}`).toBeNull();
    }
  });

  it("chave errada, lixo e vazio são rejeitados", async () => {
    const p = await emitirPasse(conteudo, chaves);
    expect(await abrirPasse(p, { atual: 1, segredos: { 1: "outra" } })).toBeNull();
    expect(await abrirPasse("abc", chaves)).toBeNull();
    expect(await abrirPasse("", chaves)).toBeNull();
    expect(await abrirPasse("!!!", chaves)).toBeNull();
  });

  it("rotação: passe antigo abre com a chave anterior, novos usam a atual", async () => {
    const antigo = await emitirPasse(conteudo, chaves);
    const rotacionado = { atual: 2, segredos: { 2: "segredo-dois", 1: "segredo-um" } };
    expect(await abrirPasse(antigo, rotacionado)).toEqual(conteudo);
    const novo = await emitirPasse(conteudo, rotacionado);
    expect(deBase64url(novo)![0]).toBe(2);
    expect(await abrirPasse(novo, chaves)).toBeNull();
  });

  it("dois passes iguais têm IVs diferentes", async () => {
    expect(await emitirPasse(conteudo, chaves)).not.toBe(await emitirPasse(conteudo, chaves));
  });

  it("vencimento em 12 meses a partir do pagamento", () => {
    expect(expiraEm(new Date("2026-10-18T15:05:00Z")).toISOString()).toBe("2027-10-18T15:05:00.000Z");
    expect(passeVencido(conteudo, new Date("2027-10-18T14:59:59Z"))).toBe(false);
    expect(passeVencido(conteudo, new Date("2027-10-18T15:00:00Z"))).toBe(true);
  });
});
