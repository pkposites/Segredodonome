# Registro de decisões

## Como ler
- **v0.1**: pré-documentação escrita com o Claude.
- **v0.2**: revisão externa por outra IA (PDF de 18/10/2026).
- **v0.3**: consolidação final (este pacote). Cada linha diz o que ficou e por quê.

## Decisões consolidadas

| Tema | v0.1 | v0.2 | v0.3 (vale) | Motivo |
|---|---|---|---|---|
| Escopo do MVP | Nome + Casal | Só Nome | **Só Nome**; Casal como "em breve" com lista de espera | Lançar mais rápido e medir demanda do Casal sem construir |
| Preço | R$ 11,90 + bump R$ 7 | Bump adiado | **R$ 11,90, sem bump** | Não vender trilha que não existe |
| Resultado grátis | Texto cortado no meio para gerar curiosidade | Grátis completo, sem frase cortada | **Grátis completo** + oferta de profundidade | Honestidade e menos reembolso |
| Prévia do pago | Borrão sobre o texto | Proibir borrão que simule conteúdo inexistente | **Primeira frase real visível + resto desfocado** | O texto pago existe e já está calculado; é prévia honesta |
| Raridade ("só X% têm") | Sim, estimada | Proibir | **Fora do MVP**; só volta com base real e rótulo claro | Evitar número sem base |
| Nome "como no documento" | Sim | Aceitar nome de uso | **Nome de uso, inclusive social** | Respeito e LGPD (minimização) |
| Gênero | Inferir pelo nome | Não inferir | **Pergunta opcional (Ela/Ele/Neutro)**; arquétipos com nomes neutros | Não inferir; nomes neutros evitam o problema |
| Nomes dos arquétipos | O Pioneiro, O Visionário… | — | **9 arquétipos: A Chama, A Ponte, A Voz, A Raiz, O Vento, O Abrigo, O Farol, O Leme, O Horizonte** | Neutros, mais compartilháveis, sem cara de horóscopo |
| Data de nascimento | Obrigatória | Questionar necessidade | **Obrigatória para calcular, descartada depois** | É base de 2 das 6 seções pagas; guardamos só o resultado |
| Chave para refazer | Hash de nome + data | Token aleatório + HMAC | **Token aleatório para acesso; HMAC com segredo para deduplicar** | Hash simples é previsível |
| Perguntas | 6, cada opção 1 polo | 4–6, documentar pesos | **5 perguntas, cada opção pontua os 2 eixos** | 5 votos por eixo nunca empatam; respostas aparecem no resultado |
| E-mail | Obrigatório antes do resultado | Opcional antes do grátis | **Nenhum e-mail enviado.** O Mercado Pago exige o e-mail do pagador para gerar o Pix: ele é repassado e descartado. Entrega, comprovante e recuperação na tela | Decisão do Rob: menos atrito, menos dado pessoal e um serviço a menos |
| Animação de processamento | 8–12 s | Evitar obrigatória | **Até 4 s, com "Pular" e respeito a movimento reduzido** | Valor percebido sem irritar |
| Rolagem automática | Sim | Evitar | **Botão "Continuar"** em vez de rolar sozinho | Controle do usuário |
| Recuperação de Pix | 15 min e 24 h | Cautela | **Na tela + remarketing (R6)**, sem e-mail | Decisão do Rob |
| "Numerologia" | Não citar, esconder método | Não esconder | **Não usar a palavra; explicar honestamente o método lúdico** | Transparência sem tom esotérico |
| Painel | Simples, com senha | Completo, MFA, 7 telas, importador Meta | **Login + MFA, 6 telas enxutas, gasto manual no MVP; importador na fase 3** | Segurança sem atrasar a primeira venda |
| Tabelas | 4 | 10 | **11** (`supabase/migrations/0001_init.sql`), incluindo histórico de transições, eventos do webhook e configuração | Controles de segurança/LGPD são baratos em SQL; o painel continua enxuto |
| Pixel/CAPI | Lead com e-mail | Sem PII | **Rastreamento completo no MVP (`RASTREAMENTO_META.md`): Purchase pelo servidor no webhook, deduplicado com o Pixel, pronto para bump/upsell; IP/user agent só até o envio; sem e-mail, portanto sem `em`** | A Meta precisa de compras corretas e bem correspondidas para otimizar; privacidade preservada |
| Evento de otimização | Lead | — | **InitiateCheckout no início, Purchase com volume** | Lead deixou de existir no fluxo |
| Números 11 e 22 | Arquétipos raros "mestres" | — | **Fora: tudo reduz para 1–9** | Teste com nomes reais mostrou que manter o 11 "engole" o 2 (A Ponte quase some) e o 22 praticamente nunca aparece. Com redução total, a distribuição fica entre 10% e 12,5% por arquétipo |
| Gateway de Pix | Mercado Pago | Mercado Pago | **Mercado Pago** (v0.4; Abacate Pay chegou a ser escolhido e foi trocado) | O Rob já domina o Mercado Pago Developers; taxa percentual menor que os R$ 0,80 fixos do Abacate Pay; permite achar pagamentos por `external_reference` (confirmar na Fase 0). Custo: pedir e-mail no checkout (repassado e descartado) |
| Dados de clientes | Banco com resultados e pedidos | Banco com PII minimizada | **Nenhum dado de cliente no servidor** (v0.4). Resultado recalculado; passe criptografado no navegador e no link; Mercado Pago como fonte da verdade; Cloudflare D1 só com registros de acesso (Marco Civil), contadores sem pessoa e gasto digitado; Supabase removido | Decisão do Rob: não guardar dados de ninguém |
| Eventos por etapa | Poucos eventos | — | **Só eventos padrão da Meta**: etapas do quiz separadas por URL real (`/quiz`, `/quiz/parte-2`) com `PageView`; depois `ViewContent`, `AddToCart`, `Lead`, `InitiateCheckout`, `AddPaymentInfo`, `Purchase`. Eventos automáticos e correspondência automática desligados; só parâmetros padrão | O Rob já recebeu reclamações da Meta por eventos fora do padrão; assim o Pixel fica limpo e os públicos R1–R6 continuam separados por etapa |
| Recuperação de vendas | E-mail 15 min e 24 h | Cautela | **Remarketing na Meta + recuperação na tela**; WhatsApp especificado para o futuro | Funciona sem travar o funil e sem coletar contato |
| E-mail transacional | Resend | — | **Fora** | Substituído pela entrega na tela e pelo link de acesso |
| WhatsApp | Recuperação | — | **Fora do MVP**; só um número de contato no rodapé (canal de atendimento) | Simplificar o lançamento |
| Idade | — | — | **Somente maiores de 18 anos** | Pagamento, LGPD (art. 14) e simplicidade |
| Logs de acesso | 30–90 dias | 30–90 dias | **6 meses** | Obrigação do Marco Civil da Internet, art. 15 |
| Teste de demanda | R$ 50/dia × 3 dias | Até R$ 150 se couber no caixa | **Até R$ 150, se couber no caixa** | Igual nas duas |

## Decisões de 19/10/2026 (respostas à Fase 0)

| Tema | Decisão | Onde está no código |
|---|---|---|
| Seções pagas | **7** (força da inicial, o que busca, como te enxergam, como ama, dinheiro e trabalho, ponto cego, 2027) + a frase do nome | `worker/src/conteudo/montar.ts`; especificação e `TELAS.md` atualizadas |
| `utm_campaign` no `metadata` do Mercado Pago | **Aprovado** (permite "Pagaram" por campanha no painel) | `worker/src/rotas/pagamento.ts` |
| Tamanho dos textos | Guia ajustado ao tamanho real de O Farol: grátis 140–550, pago 550–1.100. Abaixo disso é aviso, não erro | `content/GUIA_DE_CONTEUDO.md`, `worker/src/conteudo/validar.ts` |
| Login do painel | Cloudflare Access com código por e-mail, sem Google/duas etapas; texto da privacidade ajustado (versão 2026-10-c) | `legal/POLITICA_DE_PRIVACIDADE.md` |
| Validade do Pix | **30 minutos** | `PIX_VALIDADE_MINUTOS` em `worker/wrangler.toml` |
| Conteúdo | Rascunhos dos arquétipos 1–6, 8, 9 e `comum.json` **adotados como padrão**, sem revisão de tom | `content/nome/` |
| Empresa | Razão social provisória **QVN ADS**; contato qvnads@gmail.com; WhatsApp (11) 99191-2707; vigência 19/10/2026. Faltam CNPJ, endereço e domínio | `legal/`, `web/js/config.js` |

## Pendências humanas (o Rob decide)

Travam a Fase 1:
- [ ] Domínio e nome comercial definitivos
- [x] Conta Mercado Pago (Developers)
- [ ] Aplicação no Mercado Pago com credenciais de teste e de produção, e URL do webhook configurada
- [ ] Conta Cloudflare com Workers, D1 e Access (plano gratuito)

Travam o lançamento com dinheiro real:
- [x] Minutas jurídicas escritas (`legal/`)
- [ ] Preencher os campos `[...]` das minutas (razão social, CNPJ, endereço, contatos)
- [ ] Revisão rápida das minutas por advogado (recomendado)
- [ ] Contato de privacidade (e-mail do encarregado/canal de titulares)
- [ ] Percentual de taxa do Pix e imposto estimado para o painel
- [ ] Teto de gasto do teste
- [ ] Biblioteca de textos escrita e revisada (ver `content/GUIA_DE_CONTEUDO.md`)
- [ ] Criativos dos anúncios

Podem esperar:
- [x] Sem e-mail enviado e sem dados de clientes no servidor (decisão do Rob)
- [ ] Ordem das fases pós-MVP (Casal, card, indicação)

## 20/10/2026 — Painel por link secreto (decisão do Rob)
- O painel abre por link: `https://segredodonome.robson-oc96.workers.dev/painel?k=CHAVE`, com `CHAVE` = Secret `PAINEL_CHAVE` (24+ caracteres). Sem tela de senha.
- Motivo: o Cloudflare Access não protege bem um endereço `.workers.dev` só em `/painel`, e o domínio está no DNS do Netlify. O Access continua aceito no código, se um dia for ligado.
- O painel só tem números agregados (nenhum dado de cliente). Quem tiver o link vê e pode editar gasto e taxas: não compartilhe. Para trocar, mude o Secret.
- A chave não é gravada no registro de acesso (a rota é salva sem a query string) e as chamadas do painel a enviam em cabeçalho.
- `/saude` mostra só "ligado/ok/falta" de banco e segredos, para conferir a configuração sem o painel da Cloudflare.

## 21/10/2026 — Microsoft Clarity e painel mais direto (pedido do Rob)
- Clarity (projeto `z0xdcweqrj`) só carrega no domínio oficial e com cookies aceitos, como o Pixel.
- Todo o texto da página é mascarado nas gravações (`data-clarity-mask` no `<body>`): nome, data e resultado não aparecem. Recomendado também ligar "Masking: Strict" nas configurações do Clarity.
- O link de acesso (`/r#p=...`) é guardado no aparelho e sai da barra de endereço na chegada, antes de o Pixel e o Clarity carregarem: o passe não chega a nenhuma ferramenta. Para levar a outro aparelho, use o botão/QR do link de acesso.
- Política de Privacidade 2026-10-e: Clarity incluído (dados, finalidade, consentimento, retenção conforme learn.microsoft.com/clarity/setup-and-installation/data-retention).
- Painel: resumo em frase no topo, cartões principais, alerta de "onde mais se perde gente", funil e quiz; ajustes recolhidos. Dados a partir de 20/10/2026, dia em que os anúncios começaram (corrigido: com 21/10, o botão "Ontem" mostrava o dia de hoje).

## 21/10/2026 — Correções de medição (diagnóstico 26 cliques × 5 visualizações)
- Causa: o Pixel só carrega com cookies aceitos (regra mantida), e o PageView da chegada saía antes do aceite e se perdia. Agora os eventos da página atual ficam guardados em memória e vão ao Pixel logo depois do "Aceitar", com o mesmo `event_id` que o Worker já recebeu (sem contagem dupla).
- O `fbclid` sai do endereço na chegada, então o Pixel não criava o `_fbc`. Agora o site cria o `_fbc` (90 dias, como na Política) a partir do clique guardado, só depois do aceite.
- API de Conversões: eventos sem nenhum dado de usuário (cookies não aceitos) não são mais enviados, porque a Meta os recusa; recusas passam a registrar o código e o título do erro da Graph API.
- Depois da compra ou da recuperação, o endereço fica `/r` (antes voltava a `/r#p=...` com o Pixel e o Clarity ligados).
- Fontes servidas pelo próprio site (`web/fontes/`, licença OFL), sem Google Fonts; biblioteca do QR Code só baixa quando o QR aparece.
- Pendente de decisão do Rob com revisão jurídica: carregar o Pixel antes do aceite (contradiz `legal/POLITICA_DE_PRIVACIDADE.md` e `legal/TEXTOS_DE_CONSENTIMENTO.md`).

## 21/10/2026 — Pixel na chegada, sem depender do aceite (decisão do Rob)
- Motivo: só quem tocava em "Aceitar" era medido (32 cliques → 6 visualizações da página), o que derruba a otimização da campanha de Compras.
- `web/js/chegada.js` (no `<head>`, antes do app): `_fbc` do `fbclid` (domínio `.relatoriorda.com.br`, 90 dias), `_fbp`, passe fora do endereço, Pixel + PageView com `event_id`. O Worker recebe o mesmo `event_id` (deduplicação).
- O aviso de cookies informa o Pixel. Aceitar liga o Clarity; Recusar é a oposição à medição (exigida no legítimo interesse): o Pixel para, `_fbp`/`_fbc` são apagados e o Worker não envia nada à Meta sobre essa pessoa, nem a compra. Termos e 18+ continuam obrigatórios na última tela do quiz.
- Política de Privacidade 2026-10-f e Textos de Consentimento 2026-10-b: base legal da medição da Meta passa a ser legítimo interesse. **Risco jurídico assumido pelo Rob; revisão de advogado recomendada.**

## 22/10/2026 — Purchase do webhook completo (aprovado pelo Rob)
- Causa da venda real sem Purchase na Meta: o Purchase do webhook ia sem `client_user_agent`, que a Meta exige em eventos de site, e era recusado. Os Purchases com navegador só saem se a pessoa volta à página depois de pagar no banco.
- Ao gerar o Pix, o navegador e a sessão (com hash) ficam no registro do pagamento no Mercado Pago, junto com `fbp`/`fbc`; o IP não. O webhook usa esses dados no Purchase.
- O Worker registra `CAPI Purchase aceito: events_received N`. Política de Privacidade 2026-10-g.
- A venda de 21/10 não foi reenviada (decisão do Rob).

## 23/10/2026 — Avisos de venda no celular (pedido do Rob)
- Web Push padrão dos navegadores (sem serviço pago), assinado com VAPID. Secret `VAPID_PRIVADA` (JWK P-256 gerado no próprio painel).
- O painel vira app na tela de início (`/painel.webmanifest`, ícone, service worker `/painel-sw.js`). No iPhone, avisos só com o painel instalado na tela de início (iOS 16.4+).
- A cada venda contada pela primeira vez no webhook, o Worker manda um push sem conteúdo; o service worker busca a mensagem em `/admin/push/mensagem` (com a chave do painel): só "R$ 11,90 · Nª venda de hoje", nada da compradora.
- Guardados na tabela `config` (chave `push`): só os endereços de push dos aparelhos do Rob (até 5) e a última mensagem. Endereços que o serviço de push diz que sumiram (404/410) saem sozinhos.

## 23/10/2026 — Preço R$ 13,90 (decisão do Rob, troca direta)
- Preço de `nome_completo_v1`: R$ 11,90 → R$ 13,90 (+17%). Ponto de equilíbrio: a receita só cai se a taxa de compra cair mais de 14%.
- O Worker continua aceitando R$ 11,90 (`PRECO_ANTERIOR_CENTAVOS`) para Pix gerados antes da troca e para recuperar compras antigas; Purchase, comprovante e aviso usam o valor realmente pago.
- Tabela `receita` (migração 0004, criada sozinha pelo `esquema.ts`): soma por dia o valor pago, sem pessoa. O painel usa essa soma; vendas sem registro (até 23/10) contam a R$ 11,90.
- Termos 2026-10-d, Reembolso 2026-10-c e Textos de Consentimento 2026-10-c: só o valor.
- Antes de virar: conferir que nenhum anúncio cita "R$ 11,90".

## 23/10/2026 — Taxa do Pix no painel (informado pelo Rob)
- Uma venda de R$ 11,90 deixa R$ 11,78 líquidos no Mercado Pago (R$ 0,12 de taxa) → taxa do Pix = 0,99%.
- Gravado em `config` (chave `painel`): `taxa_pix_pct` 0,99 e `imposto_pct` 0. A R$ 13,90, a mesma taxa dá cerca de R$ 0,14 por venda (R$ 13,76 líquidos); conferir no extrato do MP na primeira venda ao preço novo.

## 23/10/2026 — Avisos de venda sem passo manual (pedido do Rob)
- A chave VAPID não precisa mais ser cadastrada: se não houver o Secret `VAPID_PRIVADA`, o Worker gera uma na primeira vez e guarda na tabela `config` (chave `vapid`). Exceção consciente à regra "segredos só como Secret", aceita pela simplicidade: essa chave só permite enviar avisos aos aparelhos que o Rob ativou no painel. Para trocar, apagar a linha `vapid` do `config` (os aparelhos precisam ser ativados de novo).

## 25/10/2026 — Nova oferta: R$ 17,90 + bônus Compatibilidade do casal (decisão do Rob)
- Preço de `nome_completo_v1`: R$ 13,90 → R$ 17,90. O Worker continua aceitando R$ 13,90 e R$ 11,90 (`PRECOS_ANTERIORES_CENTAVOS`) para Pix gerados antes da troca e compras antigas; Purchase, comprovante e aviso usam o valor pago.
- Oferta mais cedo: um capítulo trancado (primeira frase real de "Como ama", que já era pública na oferta) dentro do resultado grátis, logo depois da essência; barra fixa com o primeiro nome assim que a carta sai da tela (some quando o preço está à vista); lista "O que você recebe" e vitrine do bônus antes da caixa de preço. Sem escassez, cronômetro ou preço riscado.
- Bônus "Compatibilidade do casal", só depois do pagamento: `POST /bonus/casal` com o passe (pagamento conferido no Mercado Pago a cada pedido, como o completo). Carta da outra pessoa pelo nome, sintonia pela soma das duas cartas, frase pela soma dos caminhos das datas. Textos curtos, genéricos e neutros em `content/casal/casal.json`. Nome e data da outra pessoa só em memória no Worker; o resultado fica só no aparelho (`sdn_casal`), apagado em "Apagar meus dados". 18+ também para a outra pessoa.
- **Meta e rastreamento sem mudança de estrutura** (pedido do Rob): nenhum evento ou parâmetro novo; só o `value` dos eventos passa a ser 17,90. O bônus não conta nada no painel.
- Variante `jogo-v4-oferta-casal` para comparar no painel com `jogo-v3-pix-direto`.
- **Conflito com a especificação, apontado:** `ESPECIFICACAO.md` deixa a trilha Casal fora do MVP e pede "uma variável por vez em teste". Esta decisão libera uma versão curta do casal como bônus (a trilha Casal completa continua "em breve" na landing) e muda preço e oferta juntos: a variante mede o pacote, não cada peça.
- Textos jurídicos aprovados pelo Rob em 28/10/2026: Termos 2026-10-e (valor e bônus), Textos de Consentimento 2026-10-d (valor) e Política de Privacidade 2026-10-h (dados da outra pessoa no bônus, só no aparelho).

## 29/10/2026 — Preço R$ 37,00 (decisão do Rob)
- Preço de `nome_completo_v1`: R$ 17,90 → R$ 37,00, com o mesmo bônus. O Worker continua aceitando R$ 17,90, R$ 13,90 e R$ 11,90 (`PRECOS_ANTERIORES_CENTAVOS`) para Pix gerados antes da troca e compras antigas; Purchase, comprovante e aviso usam o valor pago.
- Só o número do preço muda nos textos: Termos 2026-10-f e Textos de Consentimento 2026-10-e (§3). `VERSAO_TERMOS` 2026-10-j.
- Variante `jogo-v5-preco-37` para comparar no painel com `jogo-v4-oferta-casal`. Nenhum evento novo; só o `value` passa a 37,00.
- Ordem de publicação: site primeiro, Worker logo depois (com o Worker antes, a cobrança seria maior que o preço mostrado).
