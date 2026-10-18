# Rastreamento Meta (Pixel + API de Conversões)

Objetivo: cada venda, e no futuro cada upsell, chegar à Meta **uma vez só, com valor certo e com a melhor correspondência possível**, para que as campanhas otimizem por compra real e o aprendizado de máquina da Meta evolua.

> Confirmar na Fase 0, na documentação oficial vigente da Meta: campos da API de Conversões, regras de deduplicação, formato do `fbc`, limites de tempo do `event_time` e exigências de verificação de domínio.

## 1. Arquitetura

```
Navegador ──Pixel (fbq)──────────────────────────────▶ Meta
    │  (mesmo event_id)                                ▲
    └──▶ Worker ──API de Conversões (Graph API)────────┘
                 ▲
Mercado Pago ─webhook─┘  (Purchase nasce no servidor, mesmo sem o navegador aberto)
```

- **Pixel** no front para eventos de navegação e como segunda via dos eventos importantes.
- **API de Conversões** no Worker para todos os eventos que importam para otimização. É a fonte principal.
- **Deduplicação:** Pixel e servidor mandam o **mesmo `event_name` + mesmo `event_id`**. A Meta conta uma vez.
- O **Purchase sai do servidor no webhook**, então a venda é contada mesmo se a pessoa fechar o navegador depois de pagar no app do banco (caso muito comum no Pix).

## 2. Eventos (só eventos padrão da Meta)

**Regra principal: nenhum evento personalizado.** Todas as etapas usam eventos padrão da Meta, cada um no sentido em que a Meta o entende. As etapas do quiz são separadas por **URL real** (rotas do site), e os públicos de remarketing usam regras de URL. Assim o Pixel recebe só o que a Meta conhece, e os públicos continuam separados por etapa.

| Etapa do funil | Evento Meta | URL da página | Disparo exato | `custom_data` (só parâmetros padrão) |
|---|---|---|---|---|
| 1. Chegou no site | `PageView` | `/` | Landing carregou | — |
| 2. Começou o quiz | `PageView` | `/quiz` | Primeira tela do quiz abriu | — |
| 3. Fez metade do quiz | `PageView` | `/quiz/parte-2` | Respondeu a 2ª pergunta de comportamento (o site muda a URL com `history.pushState`) | — |
| 4. Terminou e viu o resultado grátis | `ViewContent` | `/r` | Resultado grátis apareceu | `content_ids: ["nome_completo_v1"]`, `content_type: "product"`, `content_name: "Segredo do Nome"`, `value: 11.90`, `currency: "BRL"` |
| 5. Quis comprar | `AddToCart` | `/r` | Tocou em "Liberar resultado completo" (abriu o checkout) | mesmos de `ViewContent` |
| 6. Quer a trilha Casal | `AddToWishlist` | `/` | Tocou em "Quero quando lançar" no card Casal | `content_ids: ["casal_completo_v1"]`, `content_name: "Compatibilidade do Casal"` |
| 7. Gerou o Pix | `InitiateCheckout` | `/r` | Pix gerado | `value`, `currency`, `content_ids`, `contents`, `num_items` |
| 8. Pegou o código Pix | `AddPaymentInfo` | `/r` | Tocou em "Copiar código Pix" | `value`, `currency`, `content_ids` |
| 9. Comprou | `Purchase` | `/r` | Webhook do Mercado Pago confirmou o pagamento (`order_id` = ID do pagamento, `event_id` = `compra-{ID}`) | `value`, `currency`, `content_ids`, `contents`, `num_items`, `order_id`, `content_type: "product"` |

Regras:
- Todos os eventos vão por **Pixel e servidor**, com o mesmo `event_name` e o mesmo `event_id`.
- Cada evento das etapas 4 a 9 dispara **no máximo uma vez por sessão** (marcador em `sessionStorage` + `unique(event_name, event_id)` no banco). Recarregar o resultado não duplica `ViewContent`; tocar duas vezes no botão não duplica `AddToCart`.
- `PageView` dispara em cada troca de URL real (comportamento normal de site de página única), nunca em rolagem, clique ou mudança de tela sem troca de URL.
- `value` e `currency` sempre presentes e coerentes em todo evento com valor; `value` número com ponto (11.90).
- **Só parâmetros padrão** em `custom_data`: `value`, `currency`, `content_ids`, `content_type`, `content_name`, `content_category`, `contents`, `num_items`, `order_id`. Nada de parâmetros inventados (trilha, arquétipo, temperamento etc.).

## 2.1 Higiene do Pixel (para a Meta não reclamar)

- **Pixel exclusivo do projeto**, nunca compartilhado com clientes da agência.
- **Eventos automáticos desligados:** `fbq('set', 'autoConfig', false, PIXEL_ID)` antes do `init`. Isso impede a Meta de criar eventos sozinha a partir de cliques e dados da página (ex.: `SubscribedButtonClick`, `Microdata`).
- **Correspondência avançada automática desligada** nas configurações do Pixel: só o servidor envia dados de correspondência, de forma controlada.
- **Permissões de tráfego** do Pixel com lista de permissão só para o domínio do projeto, para nenhum outro site disparar no seu Pixel.
- **Domínio verificado** no Business Manager.
- **Sem dado pessoal em URL** (a Meta sinaliza "dados potencialmente violadores"): rotas não levam nome, e-mail, telefone nem data; o token do resultado é aleatório.
- **Nenhum `Purchase` pelo navegador sem o do servidor**, e nunca sem `value`/`currency`.
- **`test_event_code` só em desenvolvimento.** Em produção a variável fica vazia.
- **Nenhum evento disparado por recarregar a página**, por robôs de pré-visualização (Meta, WhatsApp) ou pelo painel admin: o painel não carrega o Pixel; o Worker ignora agentes de pré-visualização conhecidos.
- **Revisão semanal do Diagnóstico** no Gerenciador de Eventos durante o piloto; qualquer aviso vira tarefa antes de aumentar verba.
- Se no futuro precisar distinguir variações (ex.: trilha Casal), usar `content_ids` diferentes (`casal_completo_v1`), nunca um evento novo.

## 3. Compras e upsells (preparado desde o MVP)

Cada pedido pago gera **um** `Purchase`, com o valor total do pedido e os itens em `contents`.

| Situação | Pedidos | Purchase enviado |
|---|---|---|
| Só o resultado | 1 pedido | 1 Purchase, `value: 11.90`, `contents: [{id: "nome_completo_v1", quantity: 1, item_price: 11.90}]` |
| Resultado + bump (futuro) | 1 pedido com 2 itens | 1 Purchase, `value: 18.90`, `contents` com os 2 itens, `num_items: 2` |
| Upsell depois da compra (futuro, ex.: "Seu 2027 mês a mês") | Pagamento novo no Mercado Pago | 1 Purchase separado, `value` do upsell, `content_ids: ["upsell_2027_v1"]`, `order_id` do pedido novo |

- Catálogo de produtos no servidor (`product_code`, preço, nome) é a única fonte de `content_ids` e `value`.
- No Gerenciador de Eventos, criar **conversões personalizadas** filtrando `Purchase` por `content_ids` contém `bump_` ou `upsell_`, para ver nos relatórios quantas vendas tiveram bump/upsell sem criar eventos novos.
- Reembolso não gera evento negativo na Meta; fica registrado no nosso banco e no painel (ROAS real do painel desconta reembolsos).

## 4. Qualidade de correspondência (o que faz a Meta aprender)

Parâmetros enviados em `user_data` no servidor:

| Parâmetro | Origem | Observação |
|---|---|---|
| `client_ip_address` | Cabeçalho `CF-Connecting-IP` da requisição, **só se o aviso de cookies foi aceito** | Enviado na hora nos eventos disparados durante uma requisição do navegador (inclui `InitiateCheckout`). Não é guardado; por isso o `Purchase` do webhook vai sem IP (o do Pixel completa) |
| `client_user_agent` | Cabeçalho `User-Agent` da requisição, só com cookies aceitos | Mesmo tratamento do IP |
| `fbp` | Cookie `_fbp` lido no front e enviado na sessão | Não é hash |
| `fbc` | Cookie `_fbc` ou, se não existir, montado a partir do `fbclid` da URL: `fb.1.{timestamp_ms_da_chegada}.{fbclid}` | Capturado na **primeira página**, guardado no navegador, enviado no checkout e levado no `metadata` do pagamento para o Purchase do webhook |
| `external_id` | SHA-256 do `session_id` (aleatório) | Liga os eventos da mesma pessoa sem expor nada |

Campos fixos em todo evento do servidor: `action_source: "website"`, `event_source_url` (URL da página onde o fato aconteceu, sem parâmetros pessoais), `event_time` (segundos Unix do fato; no Purchase, o horário do pagamento).

Nunca enviar: nome, data de nascimento, respostas, texto do resultado, telefone.

## 5. Atribuição de campanha (UTMs dinâmicas)

Parâmetros de URL configurados no nível do anúncio na Meta:

```
utm_source=meta&utm_medium=paid_social&utm_campaign={{campaign.id}}&utm_term={{adset.id}}&utm_content={{ad.id}}
```

- O front lê UTMs e `fbclid` na chegada e guarda no navegador. A `utm_campaign` acompanha os eventos dos contadores anônimos do funil.
- CPA e ROAS por campanha: pelo Gerenciador de Anúncios (atribuição da Meta) e, no painel, por campanha via contadores anônimos.

## 6. Envio confiável

- Worker envia para `POST https://graph.facebook.com/{versão}/{PIXEL_ID}/events` com `access_token` do segredo `META_CAPI_TOKEN`.
- Envio fora do caminho crítico (`ctx.waitUntil`): o usuário nunca espera a Meta.
- Falhou? Até 3 novas tentativas na mesma execução, com espera curta. Sem registro em banco (decisão de não guardar dados); falhas aparecem nos logs do Worker sem dados pessoais.
- Falhou? Cron a cada 5 min reenvia até 5 vezes. Purchase com mais de 24 h sem confirmação gera alerta no painel.
- `META_TEST_EVENT_CODE` preenchido em desenvolvimento: todos os eventos do servidor vão para a aba Test Events.

## 7. Pixel no front

- Código base carregado de `connect.facebook.net`, liberado na CSP.
- `fbq('set', 'autoConfig', false, PIXEL_ID)` e depois `fbq('init', PIXEL_ID)`, sem correspondência avançada automática (ela poderia ler campos do formulário).
- Eventos com `fbq('track', nome, dados, { eventID })` usando o mesmo `event_id` do servidor.
- Tela de liberação: quando `POST /pagamento/status` devolve `approved`, a resposta traz `event_id_purchase` e o valor; o front dispara `fbq('track','Purchase', …, {eventID})` **uma vez** (marcador em `sessionStorage`).
- **Consentimento de cookies:** banner simples (aceitar/recusar). Com recusa, o Pixel não carrega e só a API de Conversões envia eventos, sem `fbp`. Formato final do banner: validar com o advogado (`PIXEL_EXIGE_CONSENTIMENTO`, padrão `true`).

## 8. Configuração na Meta (checklist do Rob)

- [ ] Pixel/conjunto de dados criado no Business Manager do projeto, separado dos clientes da agência
- [ ] Domínio verificado no Business Manager
- [ ] Permissões de tráfego do Pixel: lista de permissão só com o domínio do projeto
- [ ] Correspondência avançada automática e eventos automáticos desligados nas configurações do Pixel
- [ ] Token da API de Conversões gerado para esse Pixel (vai para `META_CAPI_TOKEN`, nunca para o código)
- [ ] Teste no Test Events: os 9 eventos da seção 2 chegando por **navegador e servidor**, com status "deduplicado"
- [ ] Públicos R1–R6 e E1 criados (seção 9)
- [ ] Conversões personalizadas de bump/upsell (quando existirem)
- [ ] Parâmetros de URL dinâmicos colados no nível do anúncio
- [ ] Automações de IA da Meta nos anúncios desligadas (padrão do Rob)

O Meta MCP pode ser usado pelo Claude Code na Fase 0 e no piloto para **ler** o conjunto de dados, a qualidade de correspondência e os eventos recebidos (`ads_get_datasets`, `ads_get_dataset_quality`, `ads_get_dataset_stats`). Nada de criar ou alterar campanhas sem aprovação.

## 9. Escada de otimização das campanhas

| Fase | Evento de otimização | Quando avançar |
|---|---|---|
| Lançamento | `InitiateCheckout` (se houver poucos, `ViewContent` nos primeiros dias) | Quando houver volume de compras consistente |
| Estável | `Purchase` | A Meta recomenda cerca de 50 eventos de otimização por semana por conjunto para sair da fase de aprendizado; concentrar verba em poucos conjuntos ajuda a chegar lá |
| Com upsell/bump | `Purchase` com otimização por valor | Quando houver variação real de valor entre pedidos e volume suficiente |

### Públicos de remarketing (criar no Gerenciador de Públicos)

Montados com eventos padrão e **regras de URL**. Cada público exclui a etapa seguinte e os compradores.

| Público | Inclui | Exclui | Janela | Mensagem do anúncio |
|---|---|---|---|---|
| R1 Visitou e não começou | `PageView` com URL contém `/` (todos os visitantes) | URL contém `/quiz`, `Purchase` | 7 dias | Curiosidade: "Seu nome guarda um segredo" com outro criativo |
| R2 Começou e parou | URL contém `/quiz` | URL contém `/quiz/parte-2`, `Purchase` | 3 dias | "Faltam 2 minutos para descobrir" |
| R3 Parou na metade | URL contém `/quiz/parte-2` | `ViewContent`, `Purchase` | 3 dias | "Você estava quase lá. Seu resultado está esperando" |
| R4 Viu o grátis e não quis comprar | `ViewContent` | `AddToCart`, `Purchase` | 7 dias | Profundidade: como ama, ponto cego, 2027 |
| R5 Quis comprar e não gerou o Pix | `AddToCart` | `InitiateCheckout`, `Purchase` | 5 dias | Confiança: prévia do PDF, 7 dias de garantia, Pix |
| R6 Gerou o Pix e não pagou | `InitiateCheckout` | `Purchase` | 3 dias | "Seu resultado completo ficou salvo, é só voltar" |
| E1 Compradores | `Purchase` | — | 180 dias | **Exclusão** de todas as campanhas de venda (até existir upsell) |

- Públicos de 3 dias precisam de volume; se ficarem pequenos demais para entregar, juntar R2 + R3 e R5 + R6.
- Semelhantes: a partir de `Purchase` quando houver base mínima; até lá, testar semelhante de `AddToCart`.

## 10. Metas de qualidade (acompanhar no Gerenciador de Eventos e no painel)

- Purchase do servidor = vendas aprovadas no Mercado Pago (diferença máxima de 2% por atraso).
- Deduplicação ativa nos eventos com Pixel + servidor.
- Qualidade de correspondência do Purchase: acompanhar a nota no Gerenciador de Eventos; se estiver baixa, as alavancas são o aceite de cookies (libera IP, navegador e `fbp`) e a captura correta do `fbc`.
- Painel: tabela "Meta x banco" por dia (compras e receita), com a diferença explicada (atribuição, janelas, consentimento).
