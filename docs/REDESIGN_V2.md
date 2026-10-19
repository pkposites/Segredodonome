# Redesign v2 — "jogo de descoberta" (misticismo lúdico)

Data: 19/10/2026 · Pedido do Rob: transformar a experiência num pequeno jogo de descoberta pessoal, elegante e misterioso, sem cara de formulário, sem cara de cassino e sem manipulação.

**Nada foi publicado em produção.** A prévia (`segredo-do-nome-previa.netlify.app/?demo=1`) se atualiza sozinha a partir deste branch.

## 1. Auditoria (antes)

| Ponto de atrito | Onde | O que foi feito |
|---|---|---|
| Visual "de formulário": cards retos e cinza chapado | todas as telas | Paleta nova, cartas com borda em gradiente, fundo vivo |
| "Pergunta 5 de 9" e botões de rádio | quiz | Trilha de pistas luminosa, cartas grandes com ícone, avanço automático |
| Dois cliques extras nas micro-revelações ("Continuar") | quiz, etapas 5 e 7 | Viraram notificações de pista: sem clique a mais |
| A revelação era uma página de texto | `/r` | Carta do arquétipo que vira, com número, símbolo, inicial e jeito |
| Oferta em lista | `/r` | 7 "capítulos" trancados com a primeira frase real à vista |
| "Seus dados ficam no seu aparelho" (impreciso: o nome passa pelo servidor para o cálculo) | landing | "Não guardamos seu nome nem sua data" e FAQ reescrita com precisão |
| Painel sem desistência por etapa nem comparação de versões | painel | Etapas 1–9 do quiz e tabela "Comparar versões" |

## 2. O que foi modificado

**Sistema visual** (`web/css/app.css`, `web/js/fundo.js`, `web/js/emblemas.js`, `web/js/dom.js`)
- Fundo preto-ameixa, névoas violeta e coral que derivam devagar, 14 estrelas, 7 letras translúcidas subindo (as do nome da pessoa assim que ela digita) e o símbolo do arquétipo bem fraco na revelação.
- Tudo atrás do conteúdo (`pointer-events: none`), só `transform` e `opacity`, pausado quando a aba fica escondida.
- Botão **"Efeitos"** no topo desliga a decoração (fica lembrado). Com "reduzir movimento", nada anima.
- Cores novas com contraste AA conferido pelo axe: coral, laranja, dourado suave e pêssego sobre preto-ameixa.
- Ícones SVG próprios no lugar de emojis: ficam iguais em qualquer celular.

**Entrada** (`web/js/telas/inicio.js`)
- "Seu nome esconde uma história. *Vamos descobrir?*" e o subtítulo pedido.
- Cada letra digitada acende num bloco dourado; ao avançar, as letras se reorganizam em 0,5 s.
- Botão "Começar minha descoberta".

**Escolha** — carta de jogo com ilustração própria (fechadura com letras), brilho girando, selo "Grátis para começar" e animação ao tocar. O Casal aparece trancado: "Em breve · ainda não está disponível".

**Quiz** (`web/js/telas/quiz.js`)
- Mesmas perguntas, mesma ordem de opções, mesmas entradas enviadas ao servidor.
- Cartas com ícone fixo por eixo: raio = ação + emoção, alvo = ação + razão, lua = reflexão + emoção, lupa = reflexão + razão.
- Ao tocar: brilho, marca dourada e avanço automático em 0,38 s (0,12 s com movimento reduzido).
- Trilha de 9 pistas no topo; rótulos de jornada ("Sua primeira pista", "Seu perfil está tomando forma", "Última pista antes da revelação"…); a contagem "Etapa N de 9" fica para leitores de tela.
- O primeiro nome já vem preenchido (não é pedido de novo); o cursor vai para o fim, para só completar o sobrenome.
- Notificações de pista: só progresso real ("Mais uma peça da sua descoberta foi encontrada") ou fato do próprio nome e data ("A letra R abre o seu nome", "Pista guardada: você nasceu em julho").
- Texto do aceite sem alteração (`legal/TEXTOS_DE_CONSENTIMENTO.md`, 2).

**Processamento** — as letras do nome giram em volta do verso da carta. Continua com até 4 s, "Pular" e as mesmas frases (descrevem o que o sistema realmente faz).

**Revelação e oferta** (`web/js/telas/resultado.js`)
- A carta surge de costas e vira, e o símbolo pulsa uma vez. Só na primeira revelação da sessão; nas outras aberturas, já vem de frente.
- Cada arquétipo tem uma cor de brilho própria.
- "Compartilhar minha carta" envia só o nome do arquétipo e o endereço do site: nada pessoal no texto nem no link.
- A interpretação grátis completa vem logo abaixo da carta.
- A oferta virou "Sua carta tem mais 7 capítulos": capítulos numerados e trancados, a primeira frase real de cada um, a caixa de preço com o texto jurídico intacto e o botão "Revelar os 7 capítulos — R$ 11,90".
- Depois da compra, os capítulos se abrem um a um.

**Medição** (`worker/`, migração `0003_contadores_variante.sql`)
- Contadores anônimos novos: `escolha_nome`, `quiz_passo_1`…`9`, `oferta_vista` e `pago_entregue`.
- Coluna `variante`; o front envia `jogo-v2`. Os dados antigos ficam como `v1`.
- O `metadata` do Pix leva a variante, para "Pagaram" por versão.
- Painel: filtro por versão, "Etapas do quiz (onde as pessoas desistem)" e "Comparar versões" (conclusão, oferta, compra, com aviso abaixo de 30 vendas).
- **Nenhum evento novo para a Meta**: o Pixel continua só com eventos padrão.

## 3. O que foi preservado
- Motor de cálculo, textos, regras de conteúdo pago, passe criptografado, rotas, Mercado Pago, webhook, Pixel e API de Conversões, registro de acesso, Cloudflare Access, CSP, PDF pela impressão, link de acesso com QR Code, recuperação refazendo o quiz, bloqueio de menor de 18 anos e modo demonstração.
- Textos jurídicos sem alteração.
- Nenhum dado pessoal novo em lugar nenhum.

## 4. Testes realizados
| Teste | Resultado |
|---|---|
| Vitest do Worker (inclui 2 testes novos de variante e etapas) | 73/73 |
| Typecheck e validação do conteúdo | ok · 0 erros |
| Fluxo completo na prévia (demonstração), 390×844 | ok: entrada → escolha → quiz → revelação → oferta → Pix → 7 capítulos liberados |
| Mesmo fluxo em 360×740 | ok, sem rolagem horizontal |
| Mesmo fluxo com "reduzir movimento" | ok, sem animação e sem travar |
| Fluxo real: front + Worker local + D1 local + Mercado Pago simulado | ok; todos os contadores novos gravados com `variante=jogo-v2` e a campanha |
| Acessibilidade (axe-core, WCAG 2 A/AA) em entrada, escolha, quiz e resultado | 0 violações |
| CSP do `_headers` aplicada durante os testes | nenhuma violação causada pelo site |
| Migração 0003 num D1 local com dados | aplicada; dados antigos preservados como `v1` |
| Varredura de `innerHTML` | só o helper de SVG estático do próprio site |
| Peso | CSS 9 KB + JS próprio 26 KB + QR Code 12 KB (compactados) |

## 5. Problemas encontrados e corrigidos durante o trabalho
- A trilha de pistas mostrava "[object HTMLElement]" (array aninhado). Corrigido.
- A carta não virava: a animação de entrada prendia o `transform`. A entrada passou para o invólucro.
- O cartão "Seu jeito" ficava empilhado; o gráfico 2×2 ganhou rótulos nos eixos.

## 6. Pendências antes de publicar em produção
- **CNPJ e endereço** (`[CNPJ]` e `[ENDEREÇO]` aparecem no rodapé, no checkout e nas páginas legais) e o nome empresarial exato no lugar de "QVN ADS".
- Domínio, Worker publicado, credenciais do Mercado Pago e Pixel (lista em `docs/FASE_0_AUDITORIA.md`, seção 4).
- Aplicar as migrações 0001–0003 no D1 remoto (só com aprovação).
- Teste em celular real (iPhone e Android intermediário) para conferir a fluidez das animações. O teste daqui foi em Chromium emulado.
- O QR Code (12 KB) é carregado já na entrada. Dá para carregá-lo só no checkout; ganho pequeno, deixado para depois.
- O `color-mix()` usado no brilho da carta exige navegadores de 2023 em diante (Chrome 111, Safari 16.2). Em aparelhos mais antigos, a carta perde só o brilho colorido.

## 7. Sugestões de testes A/B (um por vez, com a variante no painel)
1. **Headline da entrada:** "Seu nome esconde uma história. Vamos descobrir?" × "O que as letras do seu nome dizem sobre você?" (métrica: iniciaram ÷ visitas).
2. **Tela de escolha:** manter a carta de escolha × pular direto para o quiz (o Casal iria para a revelação). Métrica: iniciaram ÷ visitas.
3. **Avanço automático** × botão "Continuar" nas escolhas. Métrica: conclusão do quiz.
4. **Texto do botão da oferta:** "Revelar os 7 capítulos — R$ 11,90" × "Liberar resultado completo — R$ 11,90". Métrica: compra ÷ oferta vista.
5. **Posição da oferta:** logo depois da carta × depois da interpretação grátis (como está). Métrica: compra ÷ resultado visto, sem perder a percepção de valor do grátis.

Para rodar um teste: publicar a versão B com outro `CONFIG.VARIANTE` (ex.: `jogo-v2-b`) e dividir o tráfego por campanha ou por anúncio. O painel compara as variantes lado a lado. Dividir dentro do próprio site exige um sorteio guardado no navegador, que fica para quando houver volume (mínimo de 30 vendas por variante para ler a compra).

## 8. Sobre o "Painel Mãe"
Os números do painel saem dos endpoints `/admin/*` (JSON), protegidos pelo Cloudflare Access. Um painel central pode ler esses mesmos endpoints com um **token de serviço do Access** (credencial própria, criada no Zero Trust), sem dar acesso ao e-mail do Rob. A conexão MCP usada nesta sessão é só uma ferramenta de trabalho do Claude Code, não uma integração permanente: a integração de produção precisa do token de serviço e de uma decisão sobre onde o Painel Mãe roda.
