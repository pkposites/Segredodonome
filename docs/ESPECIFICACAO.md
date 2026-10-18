# Segredo do Nome — Especificação (v0.4)

Data: 18/10/2026 · Status: pronta para a Fase 0 no Claude Code
Base: pré-documentação v0.1 (Claude) + especificação v0.2 (revisão externa) + decisões do Rob (v0.4: Mercado Pago e nenhum dado de cliente no servidor; ver `ARQUITETURA.md`). O histórico de mudanças está em `DECISOES.md`.

> Este documento define requisitos. Ele não afirma que nenhum controle já existe, nem substitui orientação jurídica.

---

## 1. Produto

**O que é:** um quiz de entretenimento. A pessoa digita o nome, a data de nascimento e responde 5 perguntas rápidas. Recebe de graça o seu arquétipo com uma análise completa. Se quiser, paga R$ 11,90 no Pix e libera o resultado expandido, com mais 6 seções, PDF e link de acesso válido por 12 meses.

**Para quem:** adultos de 18 a 45 anos, maioria mulheres, que consomem conteúdo de autoconhecimento e relacionamento no Instagram. Compram por curiosidade e diversão.

**Restrições do projeto (fixas):**
- Ticket baixo, pagamento único no Pix, sem assinatura.
- Custo de operação próximo de zero por venda: textos pré-escritos montados por regras, sem IA por usuário.
- Entrega 100% digital e automática.
- Stack: HTML no Netlify + Cloudflare (Worker + banco D1 mínimo: registros de acesso, contadores sem pessoa e gasto digitado) + Mercado Pago. Sem Supabase.
- **Nenhum dado de cliente guardado no servidor** e nenhum e-mail enviado. Entrega e recuperação na tela (seção 6.1).

**Meta inicial:** R$ 2.000 a R$ 2.500/mês ≈ 170 a 210 vendas/mês a R$ 11,90 (sem bump no MVP).

## 2. Escopo

| Entra no MVP | Fica para depois |
|---|---|
| Landing com as duas trilhas (Casal como "em breve", botão "Quero quando lançar") | Trilha Casal funcionando |
| Trilha Nome completa: quiz, resultado grátis, oferta, Pix, liberação na tela, link de acesso, PDF pela impressão | Bump, indicação, card de Stories, convite do par |
| Recuperação sem dados: aparelho lembra, link de acesso, refazer o quiz encontra o pagamento | WhatsApp, upsells, IA no texto |
| Termos, privacidade, reembolso, aviso de cookies, bloqueio para menores de 18 | Importador automático de gasto da Meta |
| Pixel + API de Conversões só com eventos padrão | Experimentos A/B no painel |
| Painel do funil com custo por etapa (gasto digitado), protegido por login | Qualquer envio de e-mail |

## 3. Jornada (trilha Nome)

Especificação visual de cada tela em `web/TELAS.md`.

1. **Anúncio** (Meta) → `https://{dominio}/?utm_source=meta&utm_medium=paid_social&utm_campaign=...&utm_content=...`
2. **Landing (`/`)**
   - Animação curta no topo (até 6 s, em loop, sem som, pode ser pausada) com selo fixo **"Exemplo"**. Nomes de exemplo se alternam (Ana, Léo, Bruna, Carlos) para deixar claro que não é o nome de quem vê.
   - Campo **"Qual é o seu primeiro nome?"**. Ao digitar, a animação para e as letras passam a ser as da pessoa. Esse valor preenche o quiz.
   - Título personalizado acima dos cards: "{Nome}, o que você quer descobrir?". Sem rolagem automática forçada: um botão "Continuar" leva aos cards.
   - **Card Segredo do nome** (ativo): ícone, título, linha de proposta, 3 selos (Seu arquétipo · Amor e dinheiro · Seu 2027), "2 min · grátis pra começar", "Começar →".
   - **Card Compatibilidade do casal** (em breve): mesma estrutura, selo "Em breve", botão "Quero quando lançar" que só registra o interesse (evento `AddToWishlist`, sem pedir contato). Mede demanda da segunda trilha e forma público para avisar pelo remarketing.
   - "Como funciona" em 3 passos + explicação honesta da metodologia lúdica, FAQ, termos, privacidade, aviso de entretenimento.
3. **Quiz (`/quiz`)**, uma pergunta por tela, barra de progresso, botão voltar:
   1. Nome (pré-preenchido com o primeiro nome; pede "o nome que você usa no dia a dia, com sobrenome" e explica que o sobrenome muda o resultado). Aceita nome social.
   2. Data de nascimento (dia, mês, ano).
   3. Como prefere que a gente fale com você: Ela · Ele · Prefiro linguagem neutra (opcional; padrão neutro).
   4. a 8. Cinco perguntas de comportamento (`content/GUIA_DE_CONTEUDO.md`). Depois da 5ª e da 7ª, um balão curto de micro-revelação.
   9. Tela de consentimento: aceite dos termos/privacidade (obrigatório para processar). Sem caixa de marketing: não coletamos contato.
4. **Processamento:** até 4 s de animação das letras se reorganizando, com botão "Pular". Com `prefers-reduced-motion`, vai direto.
5. **Resultado grátis (`/r`)** — completo em si:
   - Nome do arquétipo + selo da letra inicial.
   - "Seu jeito": o temperamento, com 1 frase que cita uma das respostas dela (mostra que as respostas contaram).
   - Análise completa da essência (2 parágrafos, com 1 detalhe concreto do nome).
   - 3 características.
   - "Como chegamos nisso" (1 parágrafo honesto e lúdico).
6. **Oferta do resultado expandido** (logo abaixo, sem interromper o grátis):
   - Título "Quer ir mais fundo, {Nome}?".
   - Lista das 6 seções extras com título personalizado ("Como a {Nome} ama", "O ponto cego da {Nome}"...).
   - Para cada seção, **a primeira frase real** do texto pago visível e o restante desfocado. O texto existe e já está calculado; nada de texto falso por baixo.
   - Prévia real: miniatura da capa do PDF com o nome dela.
   - Preço total: **R$ 11,90**, pagamento único no Pix, acesso imediato, acesso ao link por 12 meses, natureza de entretenimento, política de reembolso de 7 dias.
   - Botão "Liberar resultado completo — R$ 11,90". Pode ter um leve movimento a cada poucos segundos (desligado com `prefers-reduced-motion`).
   - Barra fixa no rodapé com o botão, que aparece depois que a pessoa passa do resultado grátis.
7. **Checkout (na mesma página):** campo de e-mail com o aviso "Exigido pelo Mercado Pago para gerar o Pix. Não guardamos nem enviamos mensagens"; botão "Gerar Pix" → QR Code + copia e cola + expiração real informada pelo Mercado Pago + verificação automática a cada 4 s + botão "Já paguei". Pix expirado mostra o estado real e oferece "Gerar novo Pix".
8. **Liberação:** o Worker confirma no Mercado Pago → a página desbloqueia as seções com animação de cadeado → comprovante na tela (nº do pagamento, data, valor, vendedor e CNPJ) → **link de acesso** com "Copiar link" e QR Code → "Salvar em PDF" (impressão do navegador, com o link e o QR Code impressos).
9. **Recuperação (MVP):** remarketing na Meta por etapa + recuperação na própria tela (seção 6.1). Sem e-mail e sem WhatsApp. Especificação em `RECUPERACAO.md`.

## 4. Motor de personalização

Detalhes de conteúdo em `content/GUIA_DE_CONTEUDO.md`.

### 4.1 Princípios
- Determinístico e versionado: `algorithm_version` (ex.: `1.0.0`) + `content_version` (ex.: `2026-10-a`).
- **Nada é salvo no servidor.** O resultado é recalculado a cada abertura a partir das entradas (do navegador ou do passe). Ao mudar textos, versões antigas da biblioteca continuam disponíveis no Worker para quem comprou com elas (o passe guarda a `content_version`).
- Nenhuma aleatoriedade fora da semente derivada.

### 4.2 Normalização do nome
1. `trim`, colapsar espaços, minúsculas.
2. Remover acentos (NFD + remover marcas): á→a, ç→c, ñ→n.
3. Hífen e apóstrofo viram espaço.
4. Remover partículas isoladas: `de, da, do, das, dos, e, di, du, del, van, von`.
5. Manter só letras a–z. Se sobrarem menos de 2 letras, pedir para revisar o nome.
6. O primeiro nome exibido é o que a pessoa digitou (com acentos), não o normalizado.

### 4.3 Cálculo (interno, nunca exibido como fórmula)
Tabela: 1 = a j s · 2 = b k t · 3 = c l u · 4 = d m v · 5 = e n w · 6 = f o x · 7 = g p y · 8 = h q z · 9 = i r. Vogais = a e i o u (y é consoante).

`reduzir(n)`: somar os dígitos repetidamente até sobrar um número de 1 a 9. **Sem números "mestres" (11, 22)**: no teste com nomes reais, mantê-los fazia o 2 quase desaparecer e o 22 nunca aparecer.

| Elemento | Cálculo | Uso |
|---|---|---|
| Expressão | reduzir(soma de todas as letras) | **Arquétipo principal** |
| Coração | reduzir(soma das vogais) | Seção "O que você busca" |
| Imagem | reduzir(soma das consoantes) | Seção "Como te enxergam" |
| Caminho | reduzir(reduzir(dia) + reduzir(mês) + reduzir(ano)) | Seção "Seu ponto cego" |
| Ciclo 2027 | reduzir(reduzir(dia) + reduzir(mês) + reduzir(2027)) | Seção "Seu 2027" |
| Inicial | primeira letra do nome normalizado | Selo + seção "A força da sua inicial" |

### 4.4 Arquétipos (nomes neutros, sem gênero)

| Nº | Arquétipo | Ideia central |
|---|---|---|
| 1 | A Chama | Iniciativa, independência |
| 2 | A Ponte | Conexão, sensibilidade |
| 3 | A Voz | Expressão, alegria |
| 4 | A Raiz | Estrutura, constância |
| 5 | O Vento | Liberdade, mudança |
| 6 | O Abrigo | Cuidado, responsabilidade |
| 7 | O Farol | Profundidade, busca de sentido |
| 8 | O Leme | Ambição, direção |
| 9 | O Horizonte | Generosidade, visão ampla |

### 4.5 Temperamento (as respostas contam)
- 5 perguntas, 4 opções cada. **Cada opção pontua os dois eixos ao mesmo tempo** (grade 2×2): ação ou reflexão, emoção ou razão.
- Cada eixo recebe 5 votos: nunca empata. O lado com 3+ votos vence.
- Temperamentos: **Intenso** (ação + emoção), **Estratégico** (ação + razão), **Sereno** (reflexão + razão), **Magnético** (reflexão + emoção).
- Estabilidade: mudar 1 resposta só troca o eixo quando o placar estava 3×2. A combinação arquétipo + temperamento define o tom, os exemplos e os conselhos.
- A "resposta citada" no resultado grátis vem da pergunta de maior peso para o eixo vencedor (regra fixa, sem sorteio).

### 4.6 Semente de variação
`semente = HMAC-SHA256(SEGREDO_SEMENTE, nome_normalizado + "|" + data_iso)`. Os primeiros bytes escolhem qual das 3 redações de cada bloco aparece. A mesma pessoa sempre recebe as mesmas redações; pessoas diferentes com o mesmo arquétipo leem textos diferentes.

### 4.7 Refazer o quiz
- Mesmo nome e data, mesmas respostas → resultado idêntico ("Seu nome continua dizendo a mesma coisa").
- Respostas diferentes → mesmo núcleo, temperamento possivelmente diferente.
- Se existir pagamento aprovado no Mercado Pago para a mesma `chave` (ver `ARQUITETURA.md`, 3.4) nos últimos 12 meses → o pago é liberado de novo e um novo passe é emitido.

### 4.8 Detalhes concretos
Variáveis usadas nos textos: `{primeiro_nome}`, `{inicial}`, `{qtd_letras}`, `{letra_mais_repetida}`, `{qtd_letra_mais_repetida}`, `{comeca_com_vogal}`, `{mes_aniversario}`. Nenhum texto exibe data de nascimento completa.

## 5. Conteúdo do resultado

| Parte | Grátis | Pago |
|---|---|---|
| Arquétipo + selo da inicial | ✔ | ✔ |
| Seu jeito (temperamento) | ✔ | ✔ |
| Sua essência (2 parágrafos) | ✔ | ✔ |
| 3 características | ✔ | ✔ |
| Como chegamos nisso | ✔ | ✔ |
| A força da sua inicial | — | ✔ |
| O que você busca (coração) | — | ✔ |
| Como te enxergam (imagem) | — | ✔ |
| Como você ama | — | ✔ |
| Dinheiro e trabalho | — | ✔ |
| Seu ponto cego e como virar o jogo (caminho) | — | ✔ |
| Seu 2027, trimestre a trimestre (ciclo) | — | ✔ |
| A frase do seu nome (para print) | — | ✔ |
| PDF personalizado (10–12 págs.) | — | ✔ |

## 6. Pagamento (Pix via Mercado Pago)

Fluxo completo em `ARQUITETURA.md`. Regras:
- Produto no catálogo do servidor: `nome_completo_v1`, R$ 11,90, BRL. O front nunca envia preço.
- Criação do Pix com `external_reference = sdn1-{chave}`, descrição genérica ("Segredo do Nome - resultado completo"), e-mail do pagador repassado (exigência do Mercado Pago), `metadata` só com `fbp`, `fbc` e `event_id`, cabeçalho de idempotência com a `idempotency_key` do front. Nenhum nome, CPF ou data vai ao Mercado Pago.
- Liberação só quando a API do Mercado Pago responde aprovado, com valor 11,90 BRL e `external_reference` igual à `chave` das entradas enviadas.
- Webhook valida a assinatura, consulta o pagamento e envia o `Purchase` à Meta. Não grava nada.
- Estorno, reembolso ou contestação no Mercado Pago → o pago deixa de abrir (checagem a cada abertura).
- Reembolso: pelo painel do Mercado Pago (o Rob já opera).

### 6.1 Entrega e recuperação na tela (sem e-mail)
- **Link de acesso** com o passe criptografado depois do `#` (`/r#p=...`): "Copiar link", QR Code e impresso no PDF. Aviso: "Guarde este link ou salve o PDF. Quem tiver o link vê o seu resultado. Não enviamos e-mail."
- **Aparelho lembra:** passe e entradas no `localStorage`. A landing mostra "Bruna, seu resultado está salvo — abrir".
- **Pagou no app do banco e voltou:** a página continua consultando e libera sozinha; botão "Já paguei" força a consulta.
- **Perdeu o link:** refazer o quiz com o mesmo nome e data encontra o pagamento no Mercado Pago (4.7).
- **Comprovante na tela:** nº do pagamento, data e hora, valor, forma de pagamento, vendedor e CNPJ, com "Salvar comprovante" (impressão). Confirmação imediata da compra exigida pelo Decreto 7.962/2013.
- **PDF:** "Salvar em PDF" chama `window.print()` com folha de estilo de impressão própria (capa com nome e emblema, uma seção por página, sem botões, sem fundo escuro, link de acesso e QR Code na última página).
- **Apagar meus dados:** botão que limpa o `localStorage` deste aparelho e explica que o servidor não guarda nada.

## 7. Painel (`/painel`)

Mesmo formato do painel do teste vocacional do Rob: quantas pessoas chegaram e avançaram em cada etapa, com o gasto da Meta digitado para calcular o custo de cada etapa.

- Acesso protegido pelo **Cloudflare Access** (só o e-mail do Rob, login com código enviado pela Cloudflare).
- Filtro de período (hoje, ontem, 7 dias, 30 dias, personalizado) e de campanha (`utm_campaign`).

| Bloco | Conteúdo |
|---|---|
| Funil | Visitas → Iniciaram o quiz → Chegaram na metade → Viram o resultado → Tocaram em comprar → Geraram Pix → Pagaram. Número de cada etapa, % sobre a etapa anterior e % sobre as visitas |
| Gasto | Campo para digitar o gasto da Meta por dia (total ou por campanha); fica salvo |
| Custos | Custo por visita, por quiz iniciado, por resultado visto (custo por lead), por Pix gerado e por venda |
| Receita | Vendas × R$ 11,90, menos a taxa do Pix configurada; lucro estimado = receita líquida − gasto; ROAS = receita ÷ gasto |
| Configurações | Percentual da taxa do Pix e do imposto estimado |

- "Pagaram" vem do webhook do Mercado Pago (cada pagamento contado uma vez). Para conferência, o painel pode mostrar ao lado o total de vendas lido da API do Mercado Pago no mesmo período.
- Abaixo de 30 vendas no recorte, mostrar "dados insuficientes" ao lado dos percentuais.

## 8. Medição (Meta)

**Especificação completa em `RASTREAMENTO_META.md`.** Resumo:

- Pixel no navegador + API de Conversões no Worker, deduplicados por `event_id` gerado no servidor.
- **Só eventos padrão da Meta, nenhum evento personalizado.** Etapas: `PageView` em `/` (chegou), `PageView` em `/quiz` (começou), `PageView` em `/quiz/parte-2` (metade), `ViewContent` (viu o resultado grátis), `AddToCart` (tocou em comprar), `AddToWishlist` (quer a trilha Casal), `InitiateCheckout` (Pix gerado), `AddPaymentInfo` (copiou o código), `Purchase` (pagou). Públicos R1–R6 por evento e regra de URL. Regras de higiene do Pixel (eventos automáticos desligados, permissões de tráfego, só parâmetros padrão) em `RASTREAMENTO_META.md`.
- `Purchase` sai **do servidor no webhook do Mercado Pago**, com valor bruto, `content_ids`, `contents` e `order_id` = ID do pagamento, então conta mesmo se a pessoa fechar o navegador.
- Correspondência: `fbp` e `fbc` (montado do `fbclid` na chegada) levados no `metadata` do pagamento; nos eventos enviados durante uma requisição do navegador, também IP e user agent (só com cookies aceitos). Sem e-mail.
- UTMs dinâmicas com IDs de campanha, conjunto e anúncio, usadas nos contadores anônimos do funil.
- Escada de otimização: `InitiateCheckout` no lançamento → `Purchase` com volume → otimização por valor quando houver upsell.

## 9. Contadores do painel (sem pessoa)

Guardados no D1 por dia, etapa e `utm_campaign`, sem nenhum identificador de pessoa nem de sessão. O Worker soma 1 a cada etapa percebida: `visita`, `quiz_inicio`, `quiz_metade`, `resultado_visto`, `comprar_toque`, `pix_gerado`, `pix_pago`, `pdf_salvo`, `casal_interesse`.

## 10. Economia unitária

- Ticket MVP: R$ 11,90 (sem bump).
- Taxa do Mercado Pago para Pix: percentual da conta do Rob (confirmar no painel do Mercado Pago e cadastrar nas configurações).
- Exemplo com taxa de 1% e antes de impostos: CPA R$ 6 → sobra cerca de R$ 5,78 por venda; 180 vendas → R$ 2.142 de receita, ~R$ 21 de taxa, R$ 1.080 de mídia, ~R$ 1.041 de sobra.
- Teste inicial proposto: até R$ 150 em 3 dias, só se couber no caixa. Não declarar validação pelos primeiros dias; olhar o funil por etapa antes de concluir.
- Uma variável por vez em teste (criativo, preço ou página), salvo correção de bug.

## 11. Legal e políticas (minutas em `legal/`, detalhes em `SEGURANCA_E_LGPD.md`)

- Serviço para **maiores de 18 anos**; abaixo disso o quiz não é processado.
- Páginas `/termos`, `/privacidade`, `/reembolso`; rodapé com razão social, CNPJ, endereço, e-mail e WhatsApp de contato (Decreto 7.962/2013).
- Aviso de entretenimento na landing, no resultado e nos termos.
- Nenhum dado de cliente no servidor; registros de acesso por 6 meses (Marco Civil).
- Direito de arrependimento de 7 dias informado antes do pagamento; reembolso pelo Mercado Pago.
- Anúncios: falar do produto; não presumir características pessoais; não prometer previsão.
- Revisão com advogado antes de cobrar de verdade (recomendado).

## 12. Fora do escopo desta versão

Trilha Casal funcionando, bump, card de Stories, indicação, convite do par, WhatsApp, IA, importador automático da Meta, experimentos A/B no painel, multi-idioma.
