# Publicar o Worker (servidor) — versão simples, pelo painel da Cloudflare

- Servidor: `https://segredodonome.robson-oc96.workers.dev` (Worker `segredodonome`)
- Site: `https://segredo.relatoriorda.com.br` (domínio configurado só no Netlify)

Variáveis de texto, domínio próprio para o servidor, SQL e cron **não são necessários**: os valores de produção já estão no código (`worker/src/padroes.ts`), as tabelas são criadas sozinhas e a limpeza diária roda sem cron.

## 1. Colar o código
Workers & Pages → `segredodonome` → **Edit code** → apague tudo → cole o `worker.js` que enviei → **Deploy**.

## 2. Segredos (Settings → Variables and Secrets → Add → tipo **Secret**)
| Nome | Valor | Quando |
|---|---|---|
| `SEGREDO` | um código aleatório longo (gerador de senhas, 40+ caracteres). **Guarde num lugar seguro**: se for perdido, os links de acesso já vendidos param de abrir | agora |
| `META_CAPI_TOKEN` | Gerenciador de Eventos → "Segredo" → Configurações → API de Conversões → Gerar token | agora |
| `MP_ACCESS_TOKEN` | Mercado Pago → Suas integrações → aplicação → Credenciais (comece pelo de teste) | por último |
| `MP_WEBHOOK_SECRET` | Mesma aplicação → Webhooks → URL `https://segredodonome.robson-oc96.workers.dev/webhook/mercadopago`, evento Pagamentos → assinatura secreta | por último |

## 3. Banco (obrigatório antes de rodar anúncio)
Storage & Databases → D1 → **Create** → nome `segredo-do-nome-prod`. Depois, no Worker: Settings → **Bindings** → Add → D1 database → nome da variável `DB` → banco `segredo-do-nome-prod`. As tabelas aparecem sozinhas na primeira visita.

Sem o banco o site funciona, mas sem o registro de acesso exigido pelo Marco Civil (art. 15, 6 meses), sem contadores no painel e com a recuperação de compra desligada.

## 4. Conferir
Abra `https://segredodonome.robson-oc96.workers.dev/teste` → deve aparecer `{"erro":"nao_encontrado",...}`.

## Painel (depois)
Exige Cloudflare Access (`ADMIN_EMAILS`, `CF_ACCESS_AUD`, `CF_ACCESS_TEAM_DOMAIN`). Fica para quando o site estiver vendendo.

## Desfazer
Workers & Pages → `segredodonome` → Deployments → escolher a versão anterior → Rollback.
