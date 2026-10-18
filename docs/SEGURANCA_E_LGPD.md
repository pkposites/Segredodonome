# Segurança e LGPD

Requisitos mínimos. Não substituem auditoria de segurança nem parecer jurídico. Arquitetura em `ARQUITETURA.md`.

## 1. Princípio
O servidor **não guarda dados de clientes**. O que identifica alguém só existe no navegador da pessoa, no passe criptografado que ela carrega e no Mercado Pago (pagamento). Isso reduz o risco de vazamento e simplifica a LGPD.

## 2. Modelo de ameaças

| Ameaça | Controle obrigatório |
|---|---|
| Abrir o pago sem pagar | Conteúdo pago montado só no Worker, depois de consultar o Mercado Pago (aprovado, 11,90 BRL, `external_reference` = `sdn1-{chave}` das entradas) |
| Passe falsificado ou alterado | AES-256-GCM com `SEGREDO_PASSE`; qualquer alteração invalida; `expira_em` de 12 meses; versão `v` para rotação de chave |
| Usar o passe de outra pessoa com outras entradas | O pago é calculado das entradas **de dentro do passe**, nunca das enviadas soltas |
| Pagamento estornado continuar liberado | Status conferido no Mercado Pago a cada abertura do pago |
| Webhook falso | Assinatura `x-signature` validada; o pagamento é sempre consultado na API antes de qualquer ação |
| Manipular preço | Preço só no catálogo do servidor |
| Força bruta no "recuperar" | 10 tentativas por hora por IP; resposta 404 genérica |
| XSS / injeção | `textContent` no front; validação de esquema (zod) no Worker; CSP restrita; CORS só para o domínio |
| Abuso / raspagem dos textos | Rate limit por IP (Cloudflare); Turnstile no envio do quiz se houver abuso |
| Invasão do painel | Cloudflare Access (só o e-mail do Rob) + validação do JWT do Access e de `ADMIN_EMAILS` em `/admin/*` |
| Vazamento por terceiros | Nada pessoal em Pixel, API de Conversões, UTMs, URLs ou logs; passe só depois do `#` |
| E-mail do Mercado Pago vazar | Repassado ao Mercado Pago e descartado; nunca logado (teste obrigatório) |

## 3. Segredos (nomes das variáveis)
Worker (`wrangler secret put`): `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `SEGREDO_CHAVE`, `SEGREDO_PASSE`, `SEGREDO_SEMENTE`, `META_PIXEL_ID`, `META_CAPI_TOKEN`, `META_TEST_EVENT_CODE` (só em desenvolvimento), `PIXEL_EXIGE_CONSENTIMENTO` (padrão `true`), `ADMIN_EMAILS`, `CF_ACCESS_AUD` (identificador da aplicação no Cloudflare Access), `PUBLIC_BASE_URL`. Banco D1 ligado ao Worker por binding (`DB`), sem chave.

Front (público): `API_BASE_URL`, `META_PIXEL_ID`, `MP_PUBLIC_KEY` se a integração escolhida pedir.

Trocar `SEGREDO_CHAVE` invalida a recuperação por "refazer o quiz" de compras antigas; trocar `SEGREDO_PASSE` invalida links antigos (manter a chave anterior para leitura, por versão).

## 4. Dados pessoais tratados

| Dado | Para quê | Onde fica | Prazo |
|---|---|---|---|
| Nome, data de nascimento, tratamento, respostas | Calcular o resultado | Navegador da pessoa e dentro do passe; no Worker só em memória durante a requisição | Até a pessoa limpar o navegador; passe vale 12 meses |
| E-mail (exigido pelo Mercado Pago) | Gerar o Pix | Mercado Pago; o Worker repassa e descarta | Conforme o Mercado Pago |
| Chave (HMAC de nome + data) | Achar o pagamento no Mercado Pago | `external_reference` no Mercado Pago | Conforme o Mercado Pago |
| `fbp`, `fbc` | Medição de anúncios | `metadata` do pagamento no Mercado Pago e envio à Meta | Conforme Mercado Pago e Meta |
| IP, data/hora, rota | Marco Civil (art. 15) e segurança | Cloudflare D1 `access_logs` | 6 meses |
| IP e user agent nos eventos à Meta | Medição | Enviados na hora, não guardados | — |

Base legal (a validar com advogado): execução do serviço para o cálculo e o pagamento; obrigação legal para os registros de acesso; consentimento (aviso de cookies) para o Pixel.

## 5. Direitos dos titulares
- O servidor não tem dados para entregar, corrigir ou apagar além dos registros de acesso. A página do resultado tem "Apagar meus dados deste aparelho" (limpa o `localStorage`).
- Pedidos sobre pagamentos são encaminhados ao Mercado Pago ou atendidos pelo contato de privacidade.
- Registros de acesso não são apagados a pedido antes de 6 meses, por obrigação legal (explicar na resposta).

## 6. Consentimento
- Aceite de termos e privacidade antes de processar o quiz (registrado só no navegador: versão do texto e data).
- Aviso de cookies: sem aceite, o Pixel não carrega; o servidor envia eventos sem IP, user agent e `fbp`.

## 7. Incidentes
Responsável: Rob. Conter, avaliar, registrar, corrigir, avaliar comunicação à ANPD e aos titulares conforme as regras vigentes. Como não há base de clientes, o impacto possível se concentra em segredos do Worker (trocar imediatamente) e nos registros de acesso.

## 8. Documentos jurídicos
Minutas em `legal/` (termos, privacidade, reembolso, textos de consentimento). Serviço restrito a maiores de 18 anos.

## 9. Checklist para o advogado revisar
- Termos de uso e política de privacidade
- Bases legais da tabela da seção 4
- Arrependimento de 7 dias em produto digital entregue na hora
- Confirmação da compra só na tela (sem e-mail) frente ao Decreto 7.962/2013
- Formato do aviso de cookies do Pixel
