# Fase 0 — Auditoria, confirmações e estado do código

Data: 19/10/2026 · Autor: Claude Code, a pedido do Rob ("comece tudo que for possível desde já")

Este documento tem três funções:
1. Registrar as **inconsistências** entre os documentos do pacote v0.4 e como cada uma foi tratada no código.
2. Registrar o que foi **confirmado nas fontes oficiais** (com link) e o que ainda precisa ser conferido.
3. Listar as **credenciais** e as **decisões que dependem do Rob** antes da Fase 2 com dinheiro de teste e da Fase 4 com dinheiro real.

Nada foi criado na nuvem, nenhuma migração foi aplicada em banco remoto, nenhum deploy foi feito e nenhuma cobrança real foi gerada. Tudo roda localmente.

---

## 1. O que já está pronto (por categoria)

| Categoria | O que existe | Onde | Como foi verificado |
|---|---|---|---|
| Motor de cálculo | Normalização do nome, redução 1–9, expressão/coração/imagem/caminho/ciclo 2027, temperamento 2×2, resposta citada, semente HMAC, variáveis dos textos | `worker/src/motor/` | Testes de propriedade: 1.000 entradas determinísticas, 1.024 combinações de respostas, distribuição dos 9 arquétipos entre **10,5% e 11,7%** com 2.400 nomes brasileiros |
| Biblioteca de textos | Validador (combinação faltando, variável desconhecida, termo proibido, alternativa para nome sem letra repetida) e montagem do grátis, da oferta e do completo | `worker/src/conteudo/` | `npm run validar-conteudo`: 0 erros |
| Conteúdo (rascunho) | `comum.json` (iniciais a–z, ciclo 2027, 32 frases do temperamento, 3 "como chegamos", 10 micro-revelações) e arquétipos 1–6, 8 e 9 no formato de O Farol | `content/nome/` | Validador + varredura de gênero gramatical (`npm run lint-genero`) |
| Passe e chave | AES-256-GCM com versão de chave (rotação), HMAC da chave, validade de 12 meses a partir do pagamento | `worker/src/cripto/` | Teste de adulteração byte a byte, chave errada, rotação, vencimento |
| Pagamento | Cliente Mercado Pago (Pix, consulta, busca por `external_reference`, assinatura do webhook) | `worker/src/mercadopago.ts` | Testes unitários + simulador local |
| Medição | API de Conversões só com eventos e parâmetros padrão; Pixel só com aceite de cookies, `autoConfig` desligado | `worker/src/meta.ts`, `web/js/rastreio.js` | Testes: e-mail, nome e data nunca chegam à Meta |
| Rotas | `/resultado`, `/checkout`, `/pagamento/status`, `/recuperar`, `/webhook/mercadopago`, `/evento`, `/admin/*`, `/painel` | `worker/src/rotas/`, `worker/src/admin/` | 71 testes automatizados (Vitest) |
| Infra do Worker | Registro de acesso do Marco Civil, CORS restrito, rate limit, limpeza diária, ambientes `dev` e `production` | `worker/src/app.ts`, `worker/wrangler.toml` | `wrangler deploy --dry-run` empacota (197 KB gzip); `wrangler dev` com D1 local |
| Front | Landing, escolha, quiz, processando, resultado, oferta, checkout Pix, liberado, link com QR Code, PDF pela impressão, aviso de cookies, páginas legais | `web/` | Teste de ponta a ponta no Chromium a 390×844 (ver seção 7) |
| Painel | Funil, custos por etapa, receita, lucro, ROAS, gasto digitado, conferência com o Mercado Pago, configurações | `web/painel/index.html` (servido pelo Worker) | Renderizado com dados de exemplo, sem erros |

---

## 2. Inconsistências entre os documentos

Regra do `CLAUDE.md`: a especificação vence; o conflito é apontado em vez de escolhido em silêncio. Para cada item: o que diverge, o que foi feito e se depende de decisão.

### 2.1 Resíduos de versões anteriores em `DECISOES.md` (não afetam o código)
1. **Tabelas:** a linha "Tabelas" fala em 11 tabelas em `supabase/migrations/0001_init.sql`. Desde a v0.4 não há Supabase; são 5 tabelas no D1 (`worker/migrations/`). *Sugestão:* atualizar a linha.
2. **Painel:** "Login + MFA, 6 telas, importador na fase 3" diverge da especificação (Cloudflare Access, uma página, importador só na Fase 5). Segui a especificação.
3. **Eventos por etapa:** cita `Lead`. A especificação e o `RASTREAMENTO_META.md` não usam `Lead` no MVP (o Casal usa `AddToWishlist`). Segui a especificação.
4. **Data de nascimento:** "descartada depois; guardamos só o resultado". Na v0.4 nada é guardado no servidor, nem o resultado. Segui a v0.4.
5. **Chave para refazer:** "token aleatório para acesso". Na v0.4 o acesso é o passe criptografado. O `RASTREAMENTO_META.md`, 2.1, também diz "o token do resultado é aleatório"; o passe fica depois do `#`, então o efeito desejado (nada pessoal na URL enviada) se mantém.

### 2.2 Conflitos que exigiram escolha no código

> **Resolvidos em 19/10/2026:** itens 6 (7 seções), 8 (`utm_campaign` aprovado), 15 (guia ajustado) e 19 (texto da privacidade ajustado). Ver `DECISOES.md`.
6. **Quantas seções pagas: 6 ou 7?** A especificação (seção 1, "mais 6 seções"), a tela de oferta ("Mais 6 partes") e o `TELAS.md` ("1 de 6 partes aberta") dizem 6. A tabela da seção 5 da especificação lista **7**: força da inicial, o que você busca, como te enxergam, como você ama, dinheiro e trabalho, ponto cego e 2027 (mais a frase do nome). **Implementei as 7 da tabela**; o texto da oferta conta as seções automaticamente. Se a decisão for 6, basta dizer qual sai.
7. **Resposta citada no "Seu jeito".** Especificação 4.5: "pergunta de maior peso para o eixo vencedor". O guia (4): "pergunta do eixo com placar mais apertado; empate de aperto → pergunta 3". Como todas as perguntas têm o mesmo peso, a regra da especificação não define uma pergunta. **Implementei a regra do guia**, que é testável.
8. **`metadata` do pagamento.** A especificação diz "só `fbp`, `fbc` e `event_id`". Mas o webhook (que conta "Pagaram" no painel) não tem outra fonte para a campanha, e o painel tem filtro por `utm_campaign`. **Incluí `utm_campaign`** no `metadata` (é o ID numérico da campanha, não é dado pessoal). Se preferir não incluir, "Pagaram" por campanha fica sempre em "(sem)".
9. **`external_id` da API de Conversões.** O `RASTREAMENTO_META.md`, 4, pede `external_id` = SHA-256 de um `session_id` aleatório, mas o contrato de `/evento` e `/checkout` não tem esse campo. **Acrescentei o campo opcional `sessao_id`** (UUID aleatório por sessão do navegador, enviado só com cookies aceitos).
10. **Reenvio à Meta e alertas.** O `RASTREAMENTO_META.md` pede `unique(event_name, event_id)` "no banco", "cron a cada 5 min reenvia até 5 vezes", "Purchase com mais de 24 h sem confirmação gera alerta no painel" e "reembolso fica registrado no nosso banco". Isso contradiz "sem registro em banco" da mesma seção e a regra de não guardar dados. **Implementei:** até 4 tentativas na mesma execução (fora do caminho crítico), deduplicação pelo `event_id` na própria Meta, marcador de sessão no navegador, sem fila nem alerta. Reembolsos aparecem na conferência do painel (consulta ao Mercado Pago), não numa tabela.
11. **Painel atrás do Cloudflare Access.** O `CLAUDE.md` põe o painel em `web/painel/` (Netlify) com Access na rota `/painel`. O Access só protege hosts que passam pela Cloudflare; uma página no Netlify não fica protegida. **Solução:** o HTML continua em `web/painel/index.html`, mas é servido pelo Worker em `https://api.{dominio}/painel`, com Access nesse host para `/painel` e `/admin/*`. `npm run gerar-painel` copia o HTML para o Worker.
12. **API em subdomínio ou `/api/*`.** O `worker/API.md` deixa a decisão para a Fase 0. **Recomendo `api.{dominio}`** (Worker com domínio próprio na Cloudflare). Fazer proxy do Netlify para o Worker trocaria o IP da pessoa pelo IP do Netlify: quebraria o registro do Marco Civil e o IP enviado à Meta. Consequência: o DNS do domínio precisa estar na Cloudflare (o site principal continua no Netlify por CNAME, sem proxy).
13. **Limite de 10 tentativas por hora no `/recuperar`.** O rate limit nativo do Workers só aceita janelas de 10 s ou 60 s ([docs](https://docs.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)). **Implementei** a contagem sobre `access_logs` (a tabela que o Marco Civil já exige), sem coluna nova, com o índice da migração `0002_indice_recuperar.sql`. O binding nativo ficou como limite geral (60 por minuto por IP e rota).
14. **Contraste do `--apoio-2`.** `#6F6B66` sobre o fundo dá 3,67:1, abaixo do AA (4,5:1) que o próprio `TELAS.md` exige. Usei `#8C887F` (5,49:1), que já aparece na referência visual da landing.
15. **Tamanho dos textos pagos.** O guia pede 700–1.100 caracteres por seção paga, mas O Farol (o modelo aprovado) tem 589–688. O validador trata tamanho como **aviso**, não erro. Os rascunhos seguem o tamanho de O Farol. *Decidir:* aumentar os textos ou ajustar o guia.
16. **`PIXEL_EXIGE_CONSENTIMENTO`** aparece como segredo do Worker, mas quem carrega o Pixel é o front. No Worker, o comportamento equivalente (sem IP, navegador e `fbp` sem aceite) usa o campo `cookies_aceitos` de cada requisição. A chave ficou em `web/js/config.js`.
17. **Botão do Casal.** `TELAS.md` diz "Me avise quando lançar"; especificação e `TEXTOS_DE_CONSENTIMENTO.md` dizem "Quero quando lançar". Usei o texto jurídico, que o `CLAUDE.md` define como fonte.
18. **PageView a cada troca de URL × contadores uma vez por sessão.** O `RASTREAMENTO_META.md` diz que o `PageView` dispara a cada troca de URL real; o `TESTES_E_ACEITE.md` diz que recarregar não soma de novo. Como Pixel e contador usam o mesmo `event_id`, **implementei uma vez por etapa por sessão do navegador** para os dois.
19. **Privacidade fala em "verificação em duas etapas" no acesso administrativo.** O Cloudflare Access com código por e-mail é um fator só (posse do e-mail). Para a frase ser verdadeira, o Access precisa usar um provedor de identidade com MFA (ex.: login Google com verificação em duas etapas). *Decidir:* configurar assim ou pedir ao advogado para ajustar o texto.

### 2.3 Casos de borda descobertos ao programar
20. **Nome sem letra repetida** (ex.: "Bruno Lima"): textos com "a letra {letra_mais_repetida} se repete {qtd} vezes" diriam "se repete 1 vezes". O motor pula essas redações quando nenhuma letra se repete, e o validador exige que todo bloco com alternativas tenha pelo menos uma redação sem essa variável. Blocos sem alternativa (como ama, dinheiro, inicial) não podem usar essa variável.
21. **Apóstrofo** vira espaço (4.2), e "d" não está na lista de partículas: "D'Ávila" conta a letra D. Segui a regra; se a intenção era remover "d'", basta incluir "d" na lista.
22. **Nome sem vogais ou sem consoantes** (soma zero): coração ou imagem caem em 9, por regra fixa e testada.

---

## 3. Confirmações nas fontes oficiais

O container desta sessão bloqueia o acesso direto aos sites de documentação (só o npm passa). As confirmações abaixo vieram de buscas que retornam trechos das páginas oficiais. **Antes de virar o modo de teste do Mercado Pago, abra cada link e confira**: é o item 1 da Fase 2.

### Mercado Pago
| Ponto | Situação | Fonte |
|---|---|---|
| API escolhida: **Payments** (`POST /v1/payments` com `payment_method_id: "pix"`) | Confirmado em trechos oficiais; QR em `point_of_interaction.transaction_data.qr_code` / `qr_code_base64` | [Pix — Checkout Transparente](https://www.mercadopago.com.br/developers/pt/docs/checkout-api-payments/integration-configuration/integrate-pix) |
| Busca por `external_reference` | Confirmado: `GET /v1/payments/search` com `external_reference`, `status`, `sort`, `criteria`, `range`, `begin_date`/`end_date` (ex.: `NOW-2HOURS`), `limit` até 50, `offset` até 10.000 | [Gestão de pagamentos recebidos](https://www.mercadopago.com.br/developers/pt/docs/subscriptions/additional-content/payment-management.md) |
| Idempotência | Confirmado: cabeçalho `X-Idempotency-Key` obrigatório (UUID v4) | [Outros meios de pagamento](https://www.mercadopago.com.ar/developers/pt/docs/checkout-bricks/payment-brick/payment-submission/other-payment-methods) |
| Validade do Pix (`date_of_expiration`) | Formato `yyyy-MM-dd'T'HH:mm:ssz` confirmado; padrão de 24 h; **pagamento feito depois do prazo é devolvido** ao pagador. Limites mínimo e máximo **não confirmados**. Usei 30 min (`PIX_VALIDADE_MINUTOS`) | [Data de vencimento](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/additional-settings/expiration-date) |
| Assinatura do webhook | Confirmado: `x-signature` = `ts=…,v1=…`; manifesto `id:{data.id};request-id:{x-request-id};ts:{ts};`, omitindo as partes ausentes; HMAC-SHA256 em hex com a assinatura secreta. A unidade do `ts` aparece ora em segundos, ora em milissegundos nos exemplos: **não usei tolerância de tempo** (reenvio é inofensivo porque o processamento é idempotente) | [Webhooks](https://www.mercadopago.com/developers/en/docs/your-integrations/notifications/webhooks) |
| `payer.email` obrigatório | Confirmado nos exemplos de Pix; o simulador local também exige | Link do Pix acima |
| Estorno e contestação | Status tratados: `refunded`, `charged_back`, `in_mediation` (contestação aberta bloqueia o pago), `cancelled` + `status_detail: expired`. **Conferir** a lista completa de `status`/`status_detail` na referência | Referência de pagamentos (página a localizar) |
| Ambiente de teste | Credenciais de teste e usuários de teste existem; **o fluxo exato de aprovar um Pix de teste precisa ser conferido** na documentação ao montar o modo de teste | Painel "Suas integrações" |
| API Orders (`/v1/orders`) | Não usada. A recuperação depende da busca por `external_reference`, confirmada na Payments | — |

### Meta
| Ponto | Situação | Fonte |
|---|---|---|
| Versão da Graph API | v26.0 é a mais recente encontrada (jul/2026); deixei `META_GRAPH_VERSION = v26.0` configurável | [Changelog v26.0](https://developers.facebook.com/docs/graph-api/changelog/version26.0) |
| Deduplicação | Mesmo `event_name` + mesmo `event_id` (Pixel `eventID`); confirmado em várias fontes, **conferir** a página oficial de deduplicação | Fontes de terceiros; página oficial a localizar |
| `event_time` | Até 7 dias no passado; um evento velho derruba o lote inteiro (cada envio nosso tem 1 evento) | Fontes de terceiros; página oficial a localizar |
| Formato do `fbc` | `fb.1.{timestamp_ms}.{fbclid}` como no `RASTREAMENTO_META.md`; **não confirmado** na página oficial por esta sessão | Página oficial a localizar |
| v26.0: preenchimento automático de `fbc`/`fbp` pela Meta | Novidade da v26.0, ligada por preferência do anunciante. **Recomendo deixar desligado** para manter o controle de dados descrito no `RASTREAMENTO_META.md` | Changelog v26.0 |
| Meta MCP (leitura do Pixel) | Disponível nesta sessão, mas **não usado**: ainda não existe Pixel do projeto. Fica para depois que você criar o conjunto de dados | — |

### Cloudflare
| Ponto | Situação | Fonte |
|---|---|---|
| D1 no plano gratuito | Desde 1º/09/2026, consultas falham ao passar do limite diário de linhas lidas/escritas, até a meia-noite UTC. Cada acesso grava 1 linha em `access_logs`; com o volume do piloto, folga grande. **Conferir** os números atuais | [Changelog D1](https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/) |
| Rate limit binding | Janela de 10 ou 60 s, Wrangler ≥ 4.36 (usamos 4.151), sem custo extra, contagem por local (não exata) | [Rate Limiting](https://docs.cloudflare.com/workers/runtime-apis/bindings/rate-limit/) |
| Access: validação do JWT | Cabeçalho `Cf-Access-Jwt-Assertion`, chaves em `https://<equipe>.cloudflareaccess.com/cdn-cgi/access/certs`, conferir `aud` e `iss`; implementado com `jose` | [Validate JWTs](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/) |
| Access gratuito | Até 50 usuários no plano gratuito (fontes de terceiros); **conferir** na página de preços | Fontes de terceiros; página de preços a localizar |

---

## 4. Credenciais e cadastros (quem cria, onde guardar)

**Nenhum valor deve ser colado no chat nem no código.** Os nomes abaixo são as variáveis que o código espera.

| # | O que | Onde você cria | Onde cadastrar | Nome da variável |
|---|---|---|---|---|
| 1 | Domínio | Registrador (ex.: Registro.br) | DNS apontado para a Cloudflare | — |
| 2 | Conta Cloudflare (Workers, D1, Access) | dash.cloudflare.com | — | — |
| 3 | Banco D1 dev e prod | `npx wrangler d1 create segredo-do-nome` e `… segredo-do-nome-prod` (**comando que cria recurso: só com sua aprovação**) | `worker/wrangler.toml` (`database_id`) | `DB` (binding) |
| 4 | Access Token do Mercado Pago (teste e produção) | mercadopago.com.br/developers → Suas integrações → aplicação → Credenciais | `npx wrangler secret put MP_ACCESS_TOKEN --env …` | `MP_ACCESS_TOKEN` |
| 5 | Assinatura secreta do webhook | Mesma aplicação → Webhooks (URL: `https://api.{dominio}/webhook/mercadopago`, evento "Pagamentos") | `wrangler secret put` | `MP_WEBHOOK_SECRET` |
| 6 | Três segredos internos (32 bytes cada, diferentes por ambiente) | `openssl rand -base64 32` no seu computador | `wrangler secret put` | `SEGREDO_CHAVE`, `SEGREDO_PASSE`, `SEGREDO_SEMENTE` |
| 7 | Pixel / conjunto de dados do projeto | Gerenciador de Eventos (separado dos clientes da agência) | ID: `wrangler secret put` **e** `web/js/config.js` (público) | `META_PIXEL_ID` |
| 8 | Token da API de Conversões | Gerenciador de Eventos → conjunto de dados → Configurações | `wrangler secret put` | `META_CAPI_TOKEN` |
| 9 | Código de teste de eventos (só dev) | Aba "Testar eventos" | `.dev.vars` / segredo do ambiente dev | `META_TEST_EVENT_CODE` |
| 10 | Aplicação no Cloudflare Access | Zero Trust → Access → Applications → Self-hosted, host `api.{dominio}`, caminhos `/painel` e `/admin/*`, política "e-mail = o seu" | AUD tag e domínio da equipe: `wrangler secret put` | `CF_ACCESS_AUD`, `CF_ACCESS_TEAM_DOMAIN`, `ADMIN_EMAILS` |
| 11 | Site no Netlify | app.netlify.com, ligado a este repositório (`netlify.toml` já aponta para `web/`) | — | — |
| 12 | Dados da empresa | Você | `legal/*.md`, `web/js/config.js` (`VENDEDOR`) e depois `node web/scripts/gerar.mjs` | `[RAZÃO SOCIAL]`, `[CNPJ]` etc. |

Depois do domínio: trocar `PREENCHER_DOMINIO` em `worker/wrangler.toml`, `web/js/config.js` e `web/_headers`.

---

## 5. Como rodar e testar localmente (sem nenhuma credencial)

```bash
cd worker
npm install
cp .dev.vars.example .dev.vars        # preencha os SEGREDO_* com qualquer texto para testar
echo "MP_API_BASE=http://localhost:8790" >> .dev.vars   # usa o simulador do Mercado Pago
npm run check                          # conteúdo + tipos + 71 testes
npm run migrar:local                   # D1 local (não toca a nuvem)

# três terminais:
node scripts/mp-simulado.mjs                         # Mercado Pago simulado, porta 8790
NO_PROXY=localhost npx wrangler dev --env dev --port 8799   # Worker
node ../web/scripts/servidor-local.mjs               # site em http://localhost:8788
```

Para aprovar um Pix simulado: `curl -X POST http://localhost:8790/simular/aprovar/<id>` (o simulador imprime o comando com o ID). Também há `/simular/estornar/<id>` e `/simular/expirar/<id>`.

---

## 6. Rollback

Nada foi publicado. Para desfazer qualquer parte, basta reverter os commits deste branch. Os rascunhos de conteúdo estão em arquivos separados (`content/nome/arquetipo-{1..6,8,9}.json` e `comum.json`) e podem ser reescritos sem tocar no código.

---

## 7. Teste de ponta a ponta já executado (local, Chromium, 390×844)

Todos passaram:
- landing → escolha → quiz (URL muda para `/quiz/parte-2` depois da 2ª pergunta de comportamento) → processando → resultado grátis (7 seções fechadas com a primeira frase real);
- checkout → Pix → aprovação no simulador → liberação na página com comprovante, link de acesso (passe só depois do `#`) e QR Code;
- PDF pela impressão: 12 páginas, capa com o nome, uma seção por página, última página com link, QR Code e comprovante, sem data de nascimento;
- mesmo aparelho: a landing mostra "Bruna, seu resultado está salvo";
- outro aparelho pelo link: resultado completo;
- "perdeu tudo": refazer o quiz com o mesmo nome (escrito diferente) e a mesma data encontra a compra;
- estorno: o link passa a mostrar só o grátis e o aviso de reembolso;
- menor de 18: nada é enviado;
- 360 px sem rolagem horizontal; CSP do `_headers` aplicada sem violações.

O teste pegou um bug real que os testes unitários não pegavam: no runtime do Workers, chamar `fetch` como método de outro objeto dá "Illegal invocation". Foi corrigido nos clientes do Mercado Pago e da Meta.

---

## 8. Próximos passos (o que depende de você)

**Para a Fase 2 de verdade (Mercado Pago em modo de teste):**
1. Responder às decisões 6, 8, 15 e 19 da seção 2 (as outras já estão seguindo a especificação).
2. Comprar o domínio, colocar o DNS na Cloudflare e me autorizar a criar os dois bancos D1 e publicar o Worker `dev`.
3. Criar as credenciais de **teste** do Mercado Pago (itens 4 e 5) e cadastrá-las com `wrangler secret put`.
4. Eu confiro os pontos marcados como "conferir" na seção 3 abrindo as páginas oficiais, troco o simulador pelo Mercado Pago de teste e repito o roteiro da seção 7 no seu celular.
5. Criar o Pixel do projeto (item 7) e validar os 9 eventos no Test Events.

**Conteúdo:** revisar o tom dos rascunhos (comece por `content/nome/arquetipo-1.json` e `comum.json`). O validador aponta 251 avisos de tamanho (nenhum erro); a maior parte vem da regra de 700–1.100 caracteres do item 15.

**Antes de dinheiro real (Fase 4):** preencher os campos `[...]` das minutas, revisão do advogado (incluindo o item 19) e o checklist de `TESTES_E_ACEITE.md`.
