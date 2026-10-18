# Plano de execução

Cada fase termina com: o que foi feito, como testar manualmente, como reverter e o que ficou pendente. O Rob aprova antes da próxima.

## Fase 0 — Auditoria e plano (sem código de produção)
- Ler todos os documentos e apontar inconsistências.
- Listar credenciais e quem cadastra cada uma.
- Confirmar na documentação oficial do Mercado Pago: API para Pix (Payments ou Orders), **busca por `external_reference`**, `metadata`, idempotência, validade do Pix, assinatura do webhook (`x-signature`), campos obrigatórios do pagador, status de estorno/contestação, ambiente de teste (credenciais e usuários de teste).
- Confirmar API de Conversões da Meta (campos, `fbc`, deduplicação, versão da Graph API), Cloudflare D1 e Cloudflare Access (plano gratuito).
- Se o Meta MCP estiver disponível, usar só leitura para conferir o Pixel.
- Propor estrutura de pastas, dependências e comandos; revisar `worker/migrations/0001_init.sql`.
- **Entrega:** plano da Fase 1 aprovado.

## Fase 1 — Núcleo
- Repositório: `web/`, `worker/` (com `migrations/`), `content/`, testes, `.gitignore`, `.dev.vars.example`.
- Worker: roteamento, validação, rate limit, CORS, registro de acesso (Marco Civil) sem dados pessoais.
- Motor de cálculo puro + biblioteca de conteúdo validada + testes de propriedade.
- Passe: criptografia, expiração, versão de chave, testes de adulteração.
- **Entrega:** `POST /resultado` devolvendo o grátis localmente; testes passando.

## Fase 2 — MVP comercial (Mercado Pago em modo de teste)
- Front: landing, quiz, processamento, resultado grátis, oferta, checkout, liberação, link de acesso com QR Code, comprovante, PDF pela impressão, aviso de cookies, páginas legais.
- `POST /checkout`, `POST /pagamento/status`, `POST /recuperar`, `POST /webhook/mercadopago`, `POST /evento`.
- Pixel + API de Conversões conforme `RASTREAMENTO_META.md`, validados no Test Events.
- **Entrega:** compra completa em modo de teste, ponta a ponta, no celular, incluindo pagar com a página fechada, abrir em outro aparelho pelo link e recuperar refazendo o quiz.

## Fase 3 — Painel
- Cloudflare Access na rota `/painel`, funil com contadores, campo de gasto, custos por etapa, receita, lucro estimado e configurações.
- **Entrega:** vendas do painel batem com o painel do Mercado Pago no mesmo período; custos conferidos à mão em um dia de teste.

## Fase 4 — Piloto
- Deploy de produção (com aprovação), domínio, credenciais reais, compra real de baixo valor pelo Rob e reembolso pelo Mercado Pago (acesso pago deve cair).
- Campanha de teste com teto definido.
- **Entrega:** relatório do funil e da economia unitária.

## Fase 5 — Expansão (só com evidência de retorno)
Importador automático de gasto da Meta → card de Stories e indicação → trilha Casal → bump → WhatsApp (se o Rob decidir) → escada de preço.
