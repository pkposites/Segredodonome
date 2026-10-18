# Arquitetura sem dados de clientes

Decisão do Rob: **não guardar dados de ninguém no servidor**. O resultado fica no navegador da pessoa, e ela recupera o diagnóstico por um link de acesso. O Mercado Pago guarda o registro do pagamento.

## 1. Onde cada coisa vive

| Informação | Onde fica | Por quanto tempo |
|---|---|---|
| Nome, data de nascimento, tratamento, respostas | Navegador da pessoa (`localStorage`) e dentro do **passe** criptografado | Até a pessoa limpar o navegador; o passe vale 12 meses |
| Resultado (textos) | Não fica em lugar nenhum: o Worker recalcula a cada abertura | — |
| Pagamento (valor, data, status, ID) | Mercado Pago | Conforme o Mercado Pago |
| E-mail exigido pelo Mercado Pago | Só no Mercado Pago (o Worker repassa e descarta) | Conforme o Mercado Pago |
| Registros de acesso (IP, data/hora, rota, status HTTP) | Cloudflare D1 `access_logs` | 6 meses (Marco Civil, art. 15), depois apagados |
| Contadores do funil (sem pessoa) | Cloudflare D1 `contadores` | Indeterminado (não é dado pessoal) |
| Gasto de mídia digitado no painel | Cloudflare D1 `gasto_midia` | Indeterminado |

## 2. Os três identificadores

1. **Chave** (`chave`): `HMAC-SHA256(SEGREDO_CHAVE, nome_normalizado + "|" + data_iso)`, em hex, truncado em 32 caracteres. Irreversível sem o segredo. Vai para o Mercado Pago como `external_reference` (`sdn1-{chave}`), permitindo achar o pagamento da pessoa sem saber quem ela é.
2. **Passe** (`passe`): blob criptografado com AES-256-GCM (`SEGREDO_PASSE`) contendo `{v, nome, data, tratamento, respostas, pagamento_id, emitido_em, expira_em}`, em base64url. Só o Worker abre. É emitido depois que o pagamento é confirmado.
3. **Link de acesso**: `https://{dominio}/r#p={passe}`. O passe fica depois do `#`, então **não vai para o servidor nos acessos, nem para logs, nem para o Pixel**. O front lê o fragmento e manda o passe no corpo de uma requisição POST.

## 3. Fluxos

### 3.1 Resultado grátis
1. O quiz roda no navegador. No envio, o front manda nome, data, tratamento e respostas para `POST /resultado`.
2. O Worker valida, normaliza, calcula e devolve o resultado grátis + a oferta (títulos e primeiras frases reais). Nada é gravado.
3. O front guarda as entradas no `localStorage` (para reabrir sem refazer o quiz) e mostra o resultado.

### 3.2 Pagamento
1. `POST /checkout` com as entradas + e-mail (exigido pelo Mercado Pago) + `idempotency_key`.
2. O Worker calcula a `chave`, cria o pagamento Pix no Mercado Pago (valor do catálogo, `external_reference = sdn1-{chave}`, `metadata` com `fbp`/`fbc` e `event_id`, cabeçalho de idempotência), envia `InitiateCheckout` à Meta e devolve QR, copia e cola, expiração e `pagamento_id`. O e-mail não é gravado.
3. O front consulta `POST /pagamento/status` a cada 4 s com `pagamento_id` + entradas.
4. Quando o Mercado Pago responde "aprovado", com valor e `external_reference` batendo com a `chave` das entradas, o Worker emite o **passe** e devolve o resultado completo.
5. O front guarda o passe no `localStorage`, troca a URL para o link de acesso e mostra o comprovante.

### 3.3 Webhook (venda com a página fechada)
1. O Mercado Pago avisa `POST /webhook/mercadopago`.
2. O Worker valida a assinatura (`x-signature`, conforme a documentação vigente), consulta o pagamento na API e, se aprovado e com `external_reference` válido, envia o `Purchase` à Meta com `event_id = "compra-{pagamento_id}"` e `fbp`/`fbc` lidos do `metadata`.
3. Nada é gravado. Se o Mercado Pago reenviar, o mesmo `event_id` faz a Meta deduplicar.

### 3.4 Abrir de novo
- **Mesmo aparelho:** a landing encontra o passe (ou as entradas) no `localStorage` e oferece "Bruna, seu resultado está salvo — abrir".
- **Outro aparelho:** a pessoa abre o **link de acesso** (copiado, escaneado do QR Code ou clicado no PDF).
- **Perdeu tudo:** refaz o quiz com o mesmo nome e a mesma data. O Worker calcula a `chave`, busca no Mercado Pago pagamentos aprovados com `external_reference = sdn1-{chave}` dos últimos 12 meses e, se achar, emite um novo passe.
- A cada abertura do pago, o Worker confere de novo o status do pagamento no Mercado Pago: estornado ou reembolsado → só o grátis.

### 3.5 Reembolso
Feito pelo Rob no painel do Mercado Pago. O acesso pago cai sozinho na próxima abertura (3.4).

## 4. Pontos a confirmar na Fase 0
- Qual API do Mercado Pago usar para Pix (Payments `/v1/payments` ou Orders `/v1/orders`) considerando: busca por `external_reference`, `metadata`, cabeçalho de idempotência, validade do Pix e formato da assinatura do webhook. Preferir a que permita **buscar pagamentos por `external_reference`**, porque a recuperação 3.4 depende disso.
- Campos obrigatórios do pagador na API escolhida (a API Orders exige `payer.email`).
- Taxa de Pix da conta do Rob, para o painel.

## 5. Limites conhecidos (aceitos)
- Quem limpar o navegador e perder o link precisa refazer o quiz com os mesmos dados para recuperar.
- Duas pessoas com o mesmo nome completo e a mesma data de nascimento compartilham a mesma `chave`; uma recuperaria o pago da outra pelo fluxo "perdeu tudo". O conteúdo seria idêntico de qualquer forma; risco aceito.
- O link de acesso dá acesso a quem o tiver. A tela avisa: "Quem tiver este link vê o seu resultado".
