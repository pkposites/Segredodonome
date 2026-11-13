# Segredo do Nome

Resultado completo por **R$ 27,00** no Pix. Adicional opcional **Compatibilidade do casal por R$ 17,00** (no mesmo Pix ou depois). A API roda em **Netlify Functions** no mesmo site. A pasta `worker/` continua no repositório só como referência até a virada; não publique o Worker de novo.

## Virada (Netlify + Mercado Pago)

Faça nesta ordem. Não apague o Worker antigo antes de um pagamento de teste passar no site novo.

1. No Netlify, no site `segredo.relatoriorda.com.br` (Site configuration → Environment variables), cadastre as variáveis abaixo em **Production**. Marque as que têm segredo como sensitive.
2. Faça o deploy desta versão (o build já publica `web/` e as functions em `netlify/functions`).
3. Abra `https://segredo.relatoriorda.com.br/saude`. Tudo que for segredo deve aparecer como `"ok"`, sem mostrar o valor.
4. No Mercado Pago (Suas integrações → Webhooks), aponte a notificação de **pagamentos** para:
   `https://segredo.relatoriorda.com.br/webhook/mercadopago`
   Use o mesmo segredo que você gravou em `MP_WEBHOOK_SECRET`.
5. Faça uma compra de teste com a credencial de teste (`TEST-...` em `MP_ACCESS_TOKEN` e `AMBIENTE` diferente de `production`, ou a credencial de produção com um Pix de verdade de valor baixo) e confira: Pix com o valor certo, Purchase na Meta e o pago abrindo.
6. Só então o Worker da Cloudflare pode ficar no ar sem receber tráfego. O front novo não chama mais `workers.dev`.

### Variáveis no Netlify

| Variável | Obrigatória | Onde achar | Observação |
|---|---|---|---|
| `SEGREDO` | sim | você inventa (32+ caracteres) | Uma frase longa. O sistema deriva as chaves do passe, da referência do Pix e da semente. Se você já tem `SEGREDO_CHAVE`, `SEGREDO_PASSE` e `SEGREDO_SEMENTE` no Worker, copie os três no lugar de gerar outros — senão os links de acesso antigos deixam de abrir. |
| `SEGREDO_CHAVE` | se já existia no Worker | Cloudflare → Worker → Settings | Copie o valor atual. |
| `SEGREDO_PASSE` | se já existia no Worker | idem | Copie o valor atual. |
| `SEGREDO_SEMENTE` | se já existia no Worker | idem | Copie o valor atual. |
| `MP_ACCESS_TOKEN` | sim | Mercado Pago → credenciais de produção | Começa com `APP_USR-`. |
| `MP_WEBHOOK_SECRET` | sim | Mercado Pago → Webhooks → segredo | O mesmo da URL nova. |
| `META_CAPI_TOKEN` | sim, para a Meta contar a compra | Gerenciador de eventos → Pixel → API de Conversões | Sem ele o site vende, mas o Purchase do servidor não sai. |
| `META_PIXEL_ID` | não | já está no código (`2132885950950048`) | Cadastre só se for trocar o Pixel. |
| `PAINEL_CHAVE` | sim | você inventa (24+ caracteres) | Abre `https://segredo.relatoriorda.com.br/painel?k=SUA_CHAVE`. |
| `PUBLIC_BASE_URL` | não | — | Padrão `https://segredo.relatoriorda.com.br`. |
| `PIX_VALIDADE_MINUTOS` | não | — | Padrão **360** (6 horas). |
| `META_GRAPH_VERSION` | não | — | Padrão `v26.0`. Confira a versão vigente em developers.facebook.com. |
| `META_TEST_EVENT_CODE` | não | Eventos de teste da Meta | Só enquanto estiver testando. Tire em produção. |
| `VAPID_PRIVADA` | não | — | Aviso de venda no celular. Sem ela, o sistema gera uma e guarda no armazenamento. |
| `ADMIN_EMAILS` | não | — | Só se o painel também usar Cloudflare Access. |
| `CF_ACCESS_AUD` | não | — | Idem. |
| `CF_ACCESS_TEAM_DOMAIN` | não | — | Idem. |
| `MP_API_BASE` | não | — | **Não cadastre em produção.** Só no computador, para o simulador (`http://127.0.0.1:8790`). |
| `AMBIENTE` | não | — | Em produção deixe vazio (vale `production`, e aí `MP_API_BASE` é ignorado). |

O Netlify Blobs (incluso no site) guarda contadores, registros de acesso e o WhatsApp autorizado. Não há banco de clientes além desse WhatsApp, e só com a caixa marcada.

### Testar neste computador

```bash
node worker/scripts/mp-simulado.mjs
cd worker && npx tsx ../netlify/servir.ts
```

Abra http://localhost:8788 no celular (ou com a janela estreita). O Pix é simulado. Para aprovar: `curl -X POST http://localhost:8790/simular/aprovar/ID`.

---

# Pacote de projeto (v0.4) — histórico

Quiz interativo de entretenimento que revela o "arquétipo" de uma pessoa a partir das letras do nome, da data de nascimento e de algumas respostas. Resultado gratuito completo; resultado expandido por **R$ 13,90 no Pix** (R$ 11,90 até 23/10/2026). Projeto próprio de low ticket do Rob (RDA).

Este pacote é o ponto de partida para construir o produto com o **Claude Code**. Ainda não há código: há especificação, decisões, banco, contratos de API, conteúdo e critérios de aceite.

## O que tem aqui

| Arquivo | Para que serve |
|---|---|
| `CLAUDE.md` | Regras de trabalho para o Claude Code (lido automaticamente por ele) |
| `docs/ESPECIFICACAO.md` | Especificação consolidada do produto: escopo, telas, motor, pagamento, painel, métricas |
| `docs/DECISOES.md` | O que mudou da v0.1 para a v0.2 e para a v0.3, e as decisões que ainda dependem do Rob |
| `docs/ARQUITETURA.md` | Como funciona sem guardar dados de clientes: passe criptografado, link de acesso, Mercado Pago como fonte da verdade |
| `docs/SEGURANCA_E_LGPD.md` | Modelo de ameaças, controles obrigatórios, retenção e direitos dos titulares |
| `docs/TESTES_E_ACEITE.md` | Testes mínimos e critérios para considerar cada fase pronta |
| `docs/RASTREAMENTO_META.md` | Pixel + API de Conversões: eventos, deduplicação, compras e upsells, correspondência, UTMs, escada de otimização |
| `docs/RECUPERACAO.md` | Recuperação: remarketing, recuperação na tela e WhatsApp (fase futura) |
| `docs/FASES.md` | Plano de execução fase a fase, com entregas e o que exige aprovação |
| `worker/API.md` | Contrato de cada endpoint do Worker (entrada, saída, erros) |
| `web/TELAS.md` | Especificação de cada tela + tokens visuais (tema escuro, laranja da trilha Nome, Newsreader + Figtree) |
| `web/referencia-visual/` | As 8 telas aprovadas em HTML estático (abrir no navegador): guia de aparência, não código final |
| `content/GUIA_DE_CONTEUDO.md` | Arquétipos, perguntas, estrutura da biblioteca de textos e regras editoriais |
| `content/nome/arquetipo-7.json` | O Farol completo: o modelo de conteúdo para os outros 8 arquétipos |
| `content/nome/exemplo-resultado-o-farol.md` | Como um resultado de O Farol fica para quem lê (simulação) |
| `legal/` | Minutas de termos de uso, privacidade, reembolso, textos de consentimento |
| `worker/migrations/0001_init.sql` | Banco mínimo na Cloudflare (D1): registros de acesso, contadores do painel e gasto. Nenhum dado de cliente |

## Como entregar ao Claude Code

1. Descompacte o zip numa pasta (ex.: `segredo-do-nome`).
2. No terminal, dentro da pasta: `git init && git add . && git commit -m "Documentação inicial v0.4"`.
3. Abra o Claude Code nessa pasta (`claude`). Ele lê o `CLAUDE.md` sozinho.
4. Cole o prompt abaixo como primeira mensagem.

```
Este repositório é o projeto Segredo do Nome. Ainda não tem código, só documentação.

Leia, nesta ordem, antes de qualquer coisa:
1. CLAUDE.md
2. docs/ESPECIFICACAO.md e docs/ARQUITETURA.md
3. docs/RASTREAMENTO_META.md, docs/SEGURANCA_E_LGPD.md, docs/FASES.md, docs/TESTES_E_ACEITE.md, docs/DECISOES.md
4. worker/API.md e worker/migrations/0001_init.sql
5. web/TELAS.md e abra as telas de web/referencia-visual/
6. content/ e legal/

Depois execute SOMENTE a Fase 0 de docs/FASES.md:
- aponte inconsistências entre os documentos;
- confirme na documentação oficial do Mercado Pago, da Meta e da Cloudflare os pontos
  listados na Fase 0, citando os links;
- liste as credenciais que eu preciso criar e onde cadastrar cada uma;
- me apresente o plano da Fase 1 com arquivos, dependências, comandos e riscos.

Não escreva código de produção, não crie recursos na nuvem e não aplique migrações
até eu aprovar o plano. Fale comigo em português, passo a passo.
```

5. Depois de cada fase, revise o resumo que ele entrega, teste o que ele indicar e só então diga "pode seguir para a Fase N".

## Antes de começar (checklist do Rob)

Veja a seção "Pendências humanas" de `docs/DECISOES.md`. As que travam a Fase 1:

- [ ] Domínio comprado
- [x] Conta Mercado Pago (Developers) · [ ] aplicação criada com credenciais de teste e de produção
- [ ] Conta Cloudflare com Workers, D1 e Access (plano gratuito)
- [ ] Preencher os campos `[...]` das minutas em `legal/` (e, se possível, revisão rápida com advogado antes de cobrar de verdade)
