# Contrato da API (Cloudflare Worker)

Base: `https://api.{dominio}` (ou rota `/api/*` no mesmo domínio — decidir na Fase 0).
Respostas em JSON. Erros: `{ "erro": "codigo", "mensagem": "texto em português" }`, sem repetir dados enviados.
**Nenhum endpoint grava dados de cliente.** O único registro gravado em toda requisição é o de acesso (IP, data/hora, rota, status), exigido pelo Marco Civil. Ver `docs/ARQUITETURA.md`.

## Entradas do resultado (formato comum)
```json
{
  "nome": "Bruna Oliveira Santos",
  "data_nascimento": "1994-03-17",
  "tratamento": "ela | ele | neutro",
  "respostas": [2, 0, 3, 1, 2]
}
```
Validação: nome 2–80 caracteres e ≥ 2 letras após normalizar; data válida; idade entre **18** e 110 anos (abaixo: `{"erro":"idade"}`, nada processado); 5 respostas de 0 a 3.

## Públicos

### `POST /resultado`
Entrada: `{ "entradas": {...}, "passe": "opcional" }`
- Sem passe: calcula e devolve o grátis + a oferta.
- Com passe válido: abre o passe, confere no Mercado Pago que o pagamento continua aprovado e devolve o completo. Pagamento estornado/reembolsado → devolve só o grátis + aviso.

Saída 200:
```json
{
  "gratis": {
    "primeiro_nome": "Bruna",
    "arquetipo": { "numero": 7, "nome": "O Farol" },
    "inicial": "B",
    "temperamento": { "id": "magnetico", "nome": "Magnético", "frase_resposta": "..." },
    "essencia": ["...", "..."],
    "caracteristicas": ["...", "...", "..."],
    "como_chegamos": "..."
  },
  "oferta": { "preco": 11.90, "moeda": "BRL", "secoes": [ { "id": "como_ama", "titulo": "Como a Bruna ama", "primeira_frase": "..." } ] },
  "completo": null,
  "versoes": { "algoritmo": "1.0.0", "conteudo": "2026-10-a" }
}
```

### `POST /checkout`
Entrada: `{ "entradas": {...}, "email": "...", "idempotency_key": "uuid", "cookies_aceitos": true, "fbp": "...", "fbc": "..." }`
Processo: valida → calcula `chave` → cria Pix no Mercado Pago (valor do catálogo, `external_reference = sdn1-{chave}`, `payer.email` repassado, `metadata` = `{fbp, fbc, event_id}`, idempotência) → envia `InitiateCheckout` (com IP e user agent só se `cookies_aceitos`) → **descarta o e-mail**.
Saída 201: `{ "pagamento_id": "...", "qr_code_base64": "...", "copia_e_cola": "...", "expira_em": "ISO-8601", "event_id_checkout": "uuid" }`

### `POST /pagamento/status`
Entrada: `{ "pagamento_id": "...", "entradas": {...} }`
- Consulta o Mercado Pago. Confere valor aceito pelo catálogo (17,90, 13,90 ou 11,90 BRL) e `external_reference` = `sdn1-{chave das entradas}` (senão 404 genérico).
- `pending` → `{ "status": "pending" }`.
- `approved` → `{ "status": "approved", "passe": "...", "comprovante": { "pagamento_id", "data_hora", "valor", "forma": "Pix" }, "completo": {...}, "event_id_purchase": "compra-{pagamento_id}" }`.
- `expired`, `cancelled`, `rejected`, `refunded`, `charged_back` → status correspondente.

### `POST /bonus/casal`
Bônus "Compatibilidade do casal", só para quem comprou (decisão de 25/10/2026).

Corpo: `{ "passe": "...", "parceria": { "nome": "Rafael Souza", "data_nascimento": "1991-07-02" } }`

- Passe inválido → 400 `passe_invalido`; sem passe ou passe vencido → 403; pagamento não aprovado, estornado ou de outra pessoa → 403 `sem_acesso`; Mercado Pago fora do ar → 502 `verificacao_indisponivel`.
- Outra pessoa: nome com 2+ letras, data válida, 18+ (menor → 403 `idade`).
- 200: `{ "casal": { "combinacao": "O Farol + O Leme", "voce": {primeiro_nome, carta:{numero,nome}, traz, pede}, "parceria": {...}, "sintonia": {titulo, texto}, "frase": "...", "versao": "casal-2026-10-a" } }`
- Nada da outra pessoa é guardado nem enviado à Meta.

### `POST /recuperar`
Entrada: `{ "entradas": {...} }` (a pessoa refez o quiz).
Busca no Mercado Pago pagamentos aprovados com `external_reference = sdn1-{chave}` nos últimos 12 meses. Achou → `{ "passe": "...", "completo": {...} }`. Não achou → 404 genérico. Limite: 10 por hora por IP.

### `POST /webhook/mercadopago`
1. Valida a assinatura (`x-signature` + `x-request-id`, conforme a documentação vigente). Inválida → 401.
2. Consulta o pagamento na API pelo ID recebido.
3. Aprovado, valor aceito pelo catálogo em BRL, `external_reference` começando com `sdn1-` → envia `Purchase` à Meta (`event_id = compra-{pagamento_id}`, `fbp`/`fbc` do `metadata`, `order_id = pagamento_id`), soma no contador `pix_pago`.
4. Responde 200. Nada é gravado; reenvios geram o mesmo `event_id` e a Meta deduplica. O contador usa a tabela `pagamentos_contados` do D1 (só o ID do pagamento, apagado em 7 dias) para não contar duas vezes.

### `POST /evento`
Entrada: `{ "tipo": "visita | quiz_inicio | quiz_metade | resultado_visto | comprar_toque | pix_copiado | pdf_salvo | casal_interesse", "utm_campaign": "...", "event_id": "uuid", "cookies_aceitos": true, "fbp": "...", "fbc": "..." }`
Soma 1 no contador anônimo do dia e envia o evento Meta padrão correspondente (`PageView`, `ViewContent`, `AddToCart`, `AddPaymentInfo`, `AddToWishlist`) com o mesmo `event_id` do Pixel. Ignora robôs de pré-visualização.
Redesign v2: tipos só de painel (sem evento Meta): `escolha_nome`, `quiz_passo_1`…`quiz_passo_9`, `oferta_vista`, `pago_entregue`. Campos opcionais: `variante` (ex.: `jogo-v2`; inválida vira `v1`) e `sessao_id` (UUID aleatório da sessão, só com cookies aceitos, vira `external_id` em SHA-256). `/checkout` também aceita `variante`, que vai no `metadata` do pagamento para o `pix_pago` do webhook.

## Admin (`/admin/*`)
Protegidos pelo **Cloudflare Access**: o Worker valida o cabeçalho `Cf-Access-Jwt-Assertion` e o e-mail em `ADMIN_EMAILS`.

| Rota | Função |
|---|---|
| `GET /admin/painel?de=&ate=&utm_campaign=` | Funil (contadores), gasto, custos por etapa, receita e lucro estimado |
| `GET /admin/vendas-mp?de=&ate=` | Total de vendas aprovadas lido da API do Mercado Pago, para conferência |
| `GET/PUT /admin/gasto` | Gasto digitado por dia (total ou por campanha) |
| `GET/PUT /admin/config` | Taxa do Pix e imposto estimado |
| `GET /admin/variantes?de=&ate=` | Comparação das versões da experiência: iniciaram, conclusão do quiz, oferta vista, compra (redesign v2) |

## Agendados (Cron Triggers)
- Diário 03:00 (America/Sao_Paulo): apagar registros de acesso com mais de 6 meses e `pagamentos_contados` com mais de 7 dias.
