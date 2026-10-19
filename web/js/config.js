// Configuração pública do front (nada aqui é segredo). Preencher antes de publicar.
export const CONFIG = {
  // URL do Worker. Em desenvolvimento: http://localhost:8799 (npx wrangler dev --env dev --port 8799)
  API_BASE_URL: location.hostname === "localhost" || location.hostname === "127.0.0.1" ? "http://localhost:8799" : "https://segredo-api.relatoriorda.com.br",
  // Vazio = Pixel desligado.
  META_PIXEL_ID: "2132885950950048",
  // Domínio oficial: só nele o Pixel carrega e só nele a demonstração (?demo=1) fica desligada.
  DOMINIOS_OFICIAIS: ["segredo.relatoriorda.com.br"],
  // Mesmo valor da variável PIXEL_EXIGE_CONSENTIMENTO do Worker: o Pixel só carrega com aceite.
  PIXEL_EXIGE_CONSENTIMENTO: true,
  VENDEDOR: {
    razao_social: "QVN ADS",
    cnpj: "31.535.502/0001-40",
    endereco: "Rua Galeno de Castro, São Paulo/SP",
    email: "qvnads@gmail.com",
    whatsapp: "(11) 99191-2707",
  },
  // Espelho do catálogo do servidor, só para o Pixel (o preço cobrado vem sempre do Worker).
  PRODUTO: { id: "nome_completo_v1", nome: "Segredo do Nome", valor: 11.9, moeda: "BRL" },
  VERSAO_TERMOS: "2026-10-c",
  VERSAO_COOKIES: "2026-10-a",
  // Versão da experiência, para comparar no painel (contadores anônimos por variante).
  VARIANTE: "jogo-v2",
};
