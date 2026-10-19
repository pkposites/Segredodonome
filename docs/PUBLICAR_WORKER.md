# Publicar o Worker (servidor) — passo a passo para o Rob

Endereços escolhidos (o nome do produto continua "Segredo do Nome"):
- Site: `https://segredo.relatoriorda.com.br` (Netlify)
- Servidor: `https://segredo-api.relatoriorda.com.br` (Cloudflare Worker)

Tempo estimado: 20 a 30 minutos. O Mercado Pago entra por último (passo 7); até lá o quiz e o resultado grátis funcionam e o botão de pagar mostra "O Mercado Pago não respondeu".

## 0. Antes de começar
- **Node.js 20 ou mais novo** instalado (nodejs.org → versão LTS). Para conferir: `node -v`.
- **O domínio `relatoriorda.com.br` precisa estar na sua conta Cloudflare** (aparece em "Websites" no painel). Se ele ainda estiver só no Registro.br ou em outro DNS:
  1. Cloudflare → *Add a domain* → `relatoriorda.com.br` → plano Free.
  2. Confira se a Cloudflare importou **todos** os registros que já existem (site atual, e-mail/MX, etc.) **antes** de trocar os servidores DNS. Se faltar algum, o que já funciona no domínio pode parar.
  3. No Registro.br, troque os servidores DNS pelos dois que a Cloudflare mostrar. Pode levar algumas horas.

## 1. Baixar o código
Use o arquivo `segredo-do-nome-worker.zip` que enviei, ou baixe o branch `claude/new-session-8to67l` do GitHub (Code → Download ZIP). Descompacte e abra um terminal **dentro da pasta `worker`**.

```bash
npm install
npx wrangler login          # abre o navegador para você entrar na Cloudflare
```

## 2. Criar o banco (D1)
```bash
npx wrangler d1 create segredo-do-nome-prod
```
A resposta mostra um `database_id` (um código com traços). **Copie esse código** e:
- cole no arquivo `wrangler.toml`, na linha `database_id = "PREENCHER_DEPOIS_DE_CRIAR_O_D1"` que fica **abaixo de `[[env.production.d1_databases]]`**; ou
- me mande o código (ele não é secreto) que eu atualizo no repositório.

Depois, criar as tabelas:
```bash
npx wrangler d1 migrations apply segredo-do-nome-prod --remote --env production
```
Responda `y` quando perguntar. Devem aparecer 3 migrações com ✅.

## 3. Gerar e cadastrar os segredos internos
Gere três códigos diferentes (rode três vezes):
```bash
openssl rand -base64 32
```
(No Windows sem openssl: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.)

Cadastre um em cada comando abaixo. O terminal pede o valor; cole e aperte Enter:
```bash
npx wrangler secret put SEGREDO_CHAVE --env production
npx wrangler secret put SEGREDO_PASSE --env production
npx wrangler secret put SEGREDO_SEMENTE --env production
```
**Guarde os três num lugar seguro** (gerenciador de senhas). Se `SEGREDO_PASSE` for perdido, os links de acesso já vendidos param de abrir; se `SEGREDO_CHAVE` for perdido, a recuperação "refazendo o quiz" das compras antigas para de funcionar.

## 4. Meta (API de Conversões)
O ID do Pixel (`2132885950950048`) já está no código. Falta só o token:
```bash
npx wrangler secret put META_CAPI_TOKEN --env production
```
(Gerenciador de Eventos → conjunto de dados "Segredo" → Configurações → API de Conversões → Gerar token de acesso.)

## 5. Publicar
```bash
npm run deploy:production
```
No fim aparece `segredo-api.relatoriorda.com.br (custom domain)`. Para conferir, abra no navegador `https://segredo-api.relatoriorda.com.br/teste`: deve aparecer `{"erro":"nao_encontrado",...}`. Isso é o esperado: o servidor está no ar e respondendo.

## 6. Me avisar
Me diga "Worker no ar". Aí eu:
- ligo o site `segredo.relatoriorda.com.br` no Netlify a esse servidor (precisa de um registro DNS que eu te passo);
- faço uma rodada de teste do quiz e do resultado grátis contra o servidor real.

## 7. Mercado Pago (por último)
Quando for a hora:
```bash
npx wrangler secret put MP_ACCESS_TOKEN --env production       # comece com o token de TESTE
npx wrangler secret put MP_WEBHOOK_SECRET --env production
```
No Mercado Pago (Suas integrações → aplicação → Webhooks): URL `https://segredo-api.relatoriorda.com.br/webhook/mercadopago`, evento **Pagamentos**. A assinatura secreta mostrada lá é o `MP_WEBHOOK_SECRET`.

## 8. Painel (Cloudflare Access) — pode ser depois
Zero Trust → Access → Applications → *Add an application* → Self-hosted → domínio `segredo-api.relatoriorda.com.br`, caminhos `painel` e `admin/*`, política "Emails" com o seu e-mail. Depois:
```bash
npx wrangler secret put ADMIN_EMAILS --env production           # o seu e-mail de login
npx wrangler secret put CF_ACCESS_AUD --env production          # "Application Audience (AUD) Tag" da aplicação
npx wrangler secret put CF_ACCESS_TEAM_DOMAIN --env production  # https://SUA-EQUIPE.cloudflareaccess.com
```
Painel: `https://segredo-api.relatoriorda.com.br/painel`.

## Se algo der errado
- `Authentication error` → rode `npx wrangler login` de novo.
- `zone not found` / erro no domínio → o `relatoriorda.com.br` ainda não está na mesma conta Cloudflare (passo 0).
- `database_id` inválido → confira se colou no bloco de **production** (o segundo), não no de dev.
- Para desfazer a publicação: Cloudflare → Workers & Pages → `segredo-do-nome` → Settings → Delete. O banco D1 fica em Storage & Databases → D1.
