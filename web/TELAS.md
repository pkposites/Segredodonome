# Telas e identidade visual (v0.4)

Referência visual aprovada: `web/referencia-visual/` (8 telas em 390 × 844, abrir no navegador). São protótipos estáticos com estilo inline: servem de **guia de aparência e ordem dos elementos**, não de código a copiar. Em conflito com este arquivo, este arquivo vence; em conflito com `docs/ESPECIFICACAO.md`, a especificação vence.

## Direção visual

> **Atualizado em 19/10/2026 (redesign v2, pedido do Rob): "misticismo lúdico".** Substitui a regra anterior que proibia roxo, brilho, estrelas e dourado. Detalhes, motivos e o que foi testado em `docs/REDESIGN_V2.md`. Vale agora:
> - Fundo preto-ameixa com névoas violeta e coral, poucas estrelas e letras translúcidas subindo devagar, sempre atrás do conteúdo e desligáveis (botão "Efeitos" e "reduzir movimento").
> - Destaques coral/laranja, dourado suave e pêssego; cartas com borda em gradiente.
> - Quiz como jogo: cartas grandes com ícone por eixo (raio, alvo, lua, lupa), avanço automático, trilha de pistas.
> - Revelação: carta do arquétipo que vira. Oferta como "capítulos" da carta.
> - Continuam proibidos: zodíaco, olhos, cristais, cara de cassino, emojis no lugar de ícones, escassez ou prova social falsa.
> - Os tokens abaixo são da v1; os vigentes estão no topo de `web/css/app.css`.

Regra anterior (v1, mantida para histórico):
- Cara de app profissional, escura, limpa. Nada de "cara de IA": sem gradiente roxo, sem brilho, sem emojis decorativos, sem estrelas, cristais, olhos, zodíaco ou dourado.
- Elementos gráficos que contextualizam: as letras do nome em blocos, o emblema do arquétipo (ex.: farol em SVG para O Farol), gráfico 2×2 do temperamento, mostrador de processamento.
- Uma cor de destaque por trilha. A tela neutra (landing) usa o destaque da trilha Nome de forma discreta.

## Tokens

```css
:root {
  /* Base */
  --bg: #0D0D10;          /* fundo */
  --superficie: #17171B;  /* cards */
  --superficie-2: #1F1F24;/* divisórias, áreas internas */
  --borda: #2B2B31;
  --borda-forte: #3A3A42;
  --texto: #F4F1EC;
  --texto-2: #CFCAC2;     /* rótulos */
  --apoio: #A39F98;       /* texto secundário */
  --apoio-2: #6F6B66;     /* legendas */

  /* Trilha Nome */
  --nome: #FF7A45;  --nome-hover: #FF9A70;  --nome-claro: #FFB58F;
  --nome-fundo: #2A1810;  /* chips e caixas tingidas */
  --nome-texto-sobre: #1A0D06; /* texto em cima do botão laranja */

  /* Trilha Casal (card "em breve") */
  --casal: #FF5C93;  --casal-claro: #FF9DBC;  --casal-fundo: #1F0610;

  /* Estados */
  --ok: #9EE6B8;  --ok-fundo: #13261B;

  --raio-card: 20px;  --raio-campo: 12px;  --raio-botao: 14px;
}
```

- **Tipografia:** Newsreader (serifa) para momentos de revelação — título da landing, nome do arquétipo, "A frase do seu nome". Figtree (sans) para todo o resto. Google Fonts com `font-display: swap`.
- **Botão principal:** fundo `--nome`, texto `--nome-texto-sobre`, altura ≥ 52px.
- **Transição de trilha:** ao escolher o card Nome, os destaques passam para `--nome` e ficam assim até o fim.
- **Movimento:** respeita `prefers-reduced-motion`; animação longa tem "Pular"/"Pausar".
- **Contraste:** AA em todo texto.

## 1. Landing (`/`) — `01-main.html`
1. Topo: marca (quadrado com "S" serifado + "Segredo do Nome") e link "Como funciona".
2. Animação (loop ≤ 6 s): letras de um nome de exemplo (Ana, Léo, Bruna, Carlos) em blocos → se reorganizam → cartão de resultado aparece. **Selo fixo "Exemplo"** no canto do cartão. Botão pausar.
3. Título serifado: "Seu nome guarda um segredo". Subtítulo: "Responda, descubra e revele em 2 minutos".
4. Campo grande: "Qual é o seu primeiro nome?" (`autocomplete="given-name"`, `autocapitalize="words"`). Ao digitar, as letras do campo substituem o exemplo e o selo "Exemplo" some.
5. Botão "Continuar" → tela de escolha.
6. "Como funciona": 3 passos + "É uma interpretação lúdica feita a partir das letras do seu nome, da sua data de nascimento e das suas respostas. É entretenimento: não é avaliação psicológica nem previsão."
7. FAQ curto (É pago? Quanto tempo? Meus dados ficam salvos? Posso refazer?).
8. Rodapé: termos, privacidade, reembolso, contato, aviso de entretenimento.
9. Se o navegador já tem passe ou entradas salvas: faixa "{Nome}, seu resultado está salvo — abrir" acima do campo.

## 2. Escolha da trilha — `02-escolha.html`
Título: "{Nome}, o que você quer descobrir?". Dois cards cheios, card inteiro clicável:
- **Segredo do nome** (ativo, laranja): ícone, linha de proposta, selos "Seu arquétipo · Amor e dinheiro · Seu 2027", rodapé "2 min · grátis pra começar" + "Começar →".
- **Compatibilidade do casal** (rosa, selo "Em breve", opacidade levemente reduzida): linha de proposta, selos "Índice de sintonia · Pontos fortes · Próximos 12 meses", botão "Me avise quando lançar" — só dispara `AddToWishlist` e o contador `casal_interesse`; **não pede contato**.

## 3. Quiz (`/quiz` → `/quiz/parte-2`) — `03-quiz.html`
- Uma pergunta por tela; barra de progresso; "Voltar"; respostas com altura ≥ 52px.
- Ordem: nome completo (pré-preenchido com o primeiro nome; ajuda "Use o nome do dia a dia, com sobrenome. O sobrenome muda o resultado.") → data de nascimento (dia/mês/ano) → tratamento (Ela, Ele, Prefiro neutro) → 5 perguntas de comportamento (4 opções cada, de `content/GUIA_DE_CONTEUDO.md`) → consentimento.
- Depois da 2ª pergunta de comportamento a URL vira `/quiz/parte-2` com `history.pushState` (gera o `PageView` da metade). Voltar do navegador funciona.
- Idade abaixo de 18: mensagem "Este conteúdo é só para maiores de 18 anos" e nada é enviado.
- Consentimento: resumo em 3 linhas + links para termos e privacidade + caixa obrigatória "Li e aceito" (versão do texto e data ficam só no navegador). **Sem caixa de novidades** (não coletamos contato).
- Botão final: "Revelar meu resultado".

## 4. Processando — `04-processando.html`
Mostrador circular + letras do nome se reorganizando em torno da inicial; 3 frases ("Lendo as letras do seu nome…", "Cruzando com a sua data…", "Montando o seu resultado…"); até 4 s; "Pular". A chamada `POST /resultado` acontece durante a animação.

## 5. Resultado grátis (`/r`) — `05-resultado.html`
1. Selo da inicial + emblema do arquétipo + "{Nome}, seu arquétipo é" + nome do arquétipo em serifa grande.
2. "Seu jeito: {Temperamento}" + gráfico 2×2 (ação/reflexão × emoção/razão) com o ponto da pessoa + frase que cita a resposta dela.
3. "Sua essência": 2 parágrafos.
4. 3 características em chips.
5. "Como chegamos nisso" (recolhível).
6. Bloco de curiosidade: "Ainda tem muito sobre você aqui" + contador "1 de 8 partes aberta" + lista das partes fechadas. Só fatos reais do resultado dela.
7. *(Depois do MVP, se aprovado)* notificação de **compra real** recente ("{Primeiro nome real} acabou de liberar…"), alimentada por pagamentos aprovados de verdade, só primeiro nome, com opção do comprador de não aparecer. **Nunca pessoas ou avaliações inventadas.**
8. "Apagar meus dados deste aparelho" (limpa o `localStorage`), discreto no fim.

## 6. Oferta — `06-oferta.html`
1. "Quer ir mais fundo, {Nome}?" → as 7 seções pagas com título personalizado e **primeira frase real** (vinda da API); o resto é texto genérico de enchimento local desfocado (`filter: blur(5px)`). O texto pago real nunca vai ao front antes do pagamento.
2. Caixa de preço: "R$ 11,90 · pagamento único no Pix · acesso imediato · link válido por 12 meses · 7 dias para desistir · conteúdo de entretenimento".
3. Botão "Liberar resultado completo — R$ 11,90" (dispara `AddToCart`). Barra fixa com o botão depois que a pessoa passa do item 5 do resultado.
4. Sem cronômetro, sem preço riscado, sem escassez.

## 7. Checkout Pix (painel deslizante) — `07-pix.html`
1. Resumo: "Resultado completo · {Arquétipo}" + "R$ 11,90".
2. Campo "E-mail para o Pix" + aviso: "Exigido pelo Mercado Pago para gerar o Pix. Não guardamos este e-mail e não enviamos mensagens."
3. "Gerar Pix" (`InitiateCheckout`) → QR Code + "Copiar código Pix" (`AddPaymentInfo`) + "Expira às HH:MM" (horário real) + "Aguardando pagamento…" (consulta a cada 4 s).
4. Botão "Já paguei" para forçar a consulta.
5. Expirado → "Este Pix expirou" + "Gerar novo Pix".
6. Rodapé: "Pagamento processado pelo Mercado Pago · 7 dias para desistir · [RAZÃO SOCIAL], CNPJ [CNPJ]".

## 8. Liberado (`/r#p={passe}`) — `08-liberado.html`
1. Toast "Pagamento confirmado" + seções desbloqueando uma a uma.
2. Comprovante na tela: ID do pagamento, data/hora, valor, forma (Pix) — exigência do Decreto 7.962/2013.
3. As seções pagas completas; no fim "A frase do seu nome" em destaque.
4. **Link de acesso:** caixa com o link, botão "Copiar link" e QR Code + aviso "Quem tiver este link vê o seu resultado. Válido por 12 meses."
5. "Salvar em PDF" (`window.print()`).
6. A URL do navegador passa a ser o link de acesso; o passe também fica no `localStorage`.

## 9. PDF (folha de impressão)
`@media print`: fundo branco, sem botões, sem barra fixa. Capa com o nome em letras grandes, selo da inicial e emblema; uma seção por página; última página com comprovante, link de acesso e QR Code; rodapé com o domínio e o aviso de entretenimento. Nunca imprime a data de nascimento.

## 10. Recuperar
- Mesmo aparelho: faixa da landing (item 1.9).
- Outro aparelho: abrir o link de acesso.
- Perdeu tudo: refazer o quiz com o mesmo nome e data; se houver pagamento aprovado, o resultado completo volta sozinho com a mensagem "Encontramos sua compra".
- Pagamento estornado: mostra só o grátis + "Este acesso foi cancelado após reembolso".

## 11. Banner de cookies
Faixa no rodapé na primeira visita: "Usamos cookies para medir anúncios e melhorar o site." + "Aceitar" e "Recusar" com o mesmo destaque + link para a privacidade. Recusar não bloqueia nada. O Pixel só carrega depois do aceite (`PIXEL_EXIGE_CONSENTIMENTO`).

## 12. Páginas legais
`/termos`, `/privacidade`, `/reembolso`, `/contato`, a partir de `legal/`.

## 13. Painel (`/painel`)
Mesmo tema escuro, funcional para desktop e celular. Protegido pelo Cloudflare Access. Uma página só:
1. Filtros: período (hoje, ontem, 7 dias, 30 dias, personalizado) e campanha.
2. Cartões no topo: gasto, vendas, receita líquida, lucro estimado, ROAS, custo por venda.
3. Funil em barras horizontais: Visitas → Iniciaram o quiz → Chegaram na metade → Viram o resultado → Tocaram em comprar → Geraram Pix → Pagaram, cada uma com número, % da etapa anterior, % das visitas e **custo por etapa**.
4. Campo de gasto: tabela por dia (e por campanha, opcional) editável, salvar.
5. Conferência: vendas do Mercado Pago no mesmo período ao lado de "Pagaram".
6. Configurações: taxa do Pix e imposto estimado.
7. "Atualizado em HH:MM" e aviso "dados insuficientes" quando houver menos de 30 vendas no recorte.
