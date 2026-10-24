// Configuração pública do front (nada aqui é segredo). Preencher antes de publicar.
export const CONFIG = {
  // URL do Worker. Em desenvolvimento: http://localhost:8799 (npx wrangler dev --env dev --port 8799)
  API_BASE_URL: location.hostname === "localhost" || location.hostname === "127.0.0.1" ? "http://localhost:8799" : "https://segredodonome.robson-oc96.workers.dev",
  // Vazio = Pixel desligado.
  META_PIXEL_ID: "2132885950950048",
  // Domínio oficial: só nele o Pixel (js/chegada.js) e o Clarity carregam, e só nele a demonstração (?demo=1) fica desligada.
  // O ID do Pixel e o domínio também estão em js/chegada.js, que roda antes deste módulo.
  DOMINIOS_OFICIAIS: ["segredo.relatoriorda.com.br"],
  // Microsoft Clarity (mapas de calor e gravações): domínio oficial e "Aceitar" no aviso de cookies.
  // Todo texto da página é mascarado (data-clarity-mask no <body>): nome e resultado nunca aparecem.
  CLARITY_ID: "z0xdcweqrj",
  VENDEDOR: {
    razao_social: "QVN ADS",
    cnpj: "31.535.502/0001-40",
    endereco: "Rua Galeno de Castro, São Paulo/SP",
    email: "qvnads@gmail.com",
    whatsapp: "(11) 99191-2707",
  },
  // Espelho do catálogo do servidor, só para o Pixel (o preço cobrado vem sempre do Worker).
  PRODUTO: { id: "nome_completo_v1", nome: "Segredo do Nome", valor: 13.9, moeda: "BRL" },
  // Mesmo preço do catálogo do Worker (worker/src/catalogo.ts), só para exibir.
  PRECO_TEXTO: "R$ 13,90",
  VERSAO_TERMOS: "2026-10-h",
  VERSAO_COOKIES: "2026-10-b",
  // Versão da experiência, para comparar no painel (contadores anônimos por variante).
  VARIANTE: "jogo-v3-pix-direto",
};
