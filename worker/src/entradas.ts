// Validação das entradas do resultado (worker/API.md, "Entradas do resultado").
import { z } from "zod";
import { normalizarNome } from "./motor/normalizar";
import type { Entradas } from "./motor";

export const IDADE_MINIMA = 18;
export const IDADE_MAXIMA = 110;

export const esquemaEntradas = z.object({
  nome: z.string().trim().min(2).max(80),
  data_nascimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tratamento: z.enum(["ela", "ele", "neutro"]),
  respostas: z.array(z.number().int().min(0).max(3)).length(5),
});

export type ErroEntradas =
  | { erro: "entradas_invalidas"; mensagem: string }
  | { erro: "nome"; mensagem: string }
  | { erro: "data"; mensagem: string }
  | { erro: "idade"; mensagem: string };

export function dataValida(iso: string): boolean {
  const [a, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(a!, m! - 1, d!));
  return dt.getUTCFullYear() === a && dt.getUTCMonth() === m! - 1 && dt.getUTCDate() === d;
}

/** Data de hoje (AAAA-MM-DD) no fuso de São Paulo. */
export function hojeEmSaoPaulo(agora: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(agora);
}

export function idadeEm(nascimento: string, hoje: string): number {
  const [an, mn, dn] = nascimento.split("-").map(Number);
  const [ah, mh, dh] = hoje.split("-").map(Number);
  let idade = ah! - an!;
  if (mh! < mn! || (mh === mn && dh! < dn!)) idade--;
  return idade;
}

export function validarEntradas(bruto: unknown, agora: Date): { ok: true; entradas: Entradas } | { ok: false; erro: ErroEntradas } {
  const r = esquemaEntradas.safeParse(bruto);
  if (!r.success) {
    return { ok: false, erro: { erro: "entradas_invalidas", mensagem: "Confira as respostas e tente de novo." } };
  }
  const e = r.data;
  if (!normalizarNome(e.nome)) {
    return { ok: false, erro: { erro: "nome", mensagem: "Confira o seu nome: precisamos de pelo menos 2 letras." } };
  }
  if (!dataValida(e.data_nascimento)) {
    return { ok: false, erro: { erro: "data", mensagem: "Confira a data de nascimento." } };
  }
  const idade = idadeEm(e.data_nascimento, hojeEmSaoPaulo(agora));
  if (idade < IDADE_MINIMA) {
    return { ok: false, erro: { erro: "idade", mensagem: "Este quiz é para maiores de 18 anos. Obrigado pelo interesse!" } };
  }
  if (idade > IDADE_MAXIMA) {
    return { ok: false, erro: { erro: "data", mensagem: "Confira a data de nascimento." } };
  }
  return { ok: true, entradas: e };
}
