// Dados de teste: nomes comuns no Brasil e um gerador pseudoaleatório com semente
// (só para os testes; o motor nunca usa aleatoriedade).

const PRIMEIROS = [
  "Maria", "Ana", "Francisca", "Antônia", "Adriana", "Juliana", "Márcia", "Fernanda", "Patrícia", "Aline",
  "Sandra", "Camila", "Amanda", "Bruna", "Jéssica", "Letícia", "Júlia", "Luciana", "Vanessa", "Mariana",
  "Gabriela", "Larissa", "Beatriz", "Rafaela", "Carolina", "Natália", "Daniela", "Tatiane", "Renata", "Priscila",
  "Isabela", "Laura", "Sofia", "Helena", "Valentina", "Alice", "Manuela", "Lívia", "Giovanna", "Yasmin",
  "José", "João", "Antônio", "Francisco", "Carlos", "Paulo", "Pedro", "Lucas", "Luiz", "Marcos",
  "Luís", "Gabriel", "Rafael", "Daniel", "Marcelo", "Bruno", "Eduardo", "Felipe", "Rodrigo", "Léo",
];

const SOBRENOMES = [
  "Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Alves", "Pereira", "Lima", "Gomes",
  "Costa", "Ribeiro", "Martins", "Carvalho", "Almeida", "Lopes", "Soares", "Fernandes", "Vieira", "Barbosa",
  "Rocha", "Dias", "Nascimento", "Andrade", "Moreira", "Nunes", "Marques", "Machado", "Mendes", "Freitas",
  "Cardoso", "Ramos", "Gonçalves", "Santana", "Teixeira", "Araújo", "Pinto", "Correia", "Moura", "Cavalcanti",
];

export function nomesBrasileiros(): string[] {
  const out: string[] = [];
  for (const p of PRIMEIROS) for (const s of SOBRENOMES) out.push(`${p} ${s}`);
  return out;
}

/** mulberry32 */
export function gerador(semente: number): () => number {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function entradasAleatorias(rnd: () => number) {
  const nomes = nomesBrasileiros();
  const ano = 1950 + Math.floor(rnd() * 55);
  const mes = 1 + Math.floor(rnd() * 12);
  const dia = 1 + Math.floor(rnd() * 28);
  const tratamentos = ["ela", "ele", "neutro"] as const;
  return {
    nome: nomes[Math.floor(rnd() * nomes.length)]!,
    data_nascimento: `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`,
    tratamento: tratamentos[Math.floor(rnd() * 3)]!,
    respostas: [0, 1, 2, 3, 4].map(() => Math.floor(rnd() * 4)),
  };
}
