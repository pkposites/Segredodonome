// Ponto de entrada do motor: das entradas validadas ao perfil calculado. Função pura
// (a não ser pelo HMAC da semente), sem nada aleatório.
import { normalizarNome, type NomeNormalizado } from "./normalizar";
import { calcularNumeros, partesDaData, type Numeros } from "./calculo";
import { calcularTemperamento, type Temperamento } from "./temperamento";
import { gerarSemente, type Semente } from "./semente";
import { calcularVariaveis, type Variaveis } from "./variaveis";

export const ALGORITHM_VERSION = "1.0.0";

export type Tratamento = "ela" | "ele" | "neutro";

export interface Entradas {
  nome: string;
  data_nascimento: string; // AAAA-MM-DD
  tratamento: Tratamento;
  respostas: number[];
}

export interface Perfil {
  nome: NomeNormalizado;
  numeros: Numeros;
  temperamento: Temperamento;
  variaveis: Variaveis & { repete: boolean };
  semente: Semente;
  tratamento: Tratamento;
}

export class NomeInvalidoError extends Error {}

export async function calcularPerfil(entradas: Entradas, segredoSemente: string): Promise<Perfil> {
  const nome = normalizarNome(entradas.nome);
  if (!nome) throw new NomeInvalidoError("Nome com menos de 2 letras após normalizar");
  const data = partesDaData(entradas.data_nascimento);
  return {
    nome,
    numeros: calcularNumeros(nome.letras, data),
    temperamento: calcularTemperamento(entradas.respostas),
    variaveis: calcularVariaveis(nome, data),
    semente: await gerarSemente(segredoSemente, nome.normalizado, entradas.data_nascimento),
    tratamento: entradas.tratamento,
  };
}
