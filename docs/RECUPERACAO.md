# Recuperação de vendas

Três camadas, da mais barata para a mais trabalhosa. Nenhuma trava o funil: tudo é opcional para quem está fazendo o quiz.

## 1. Remarketing na Meta (automático, sem dados pessoais)
Públicos R1 a R6 por etapa do funil, definidos em `RASTREAMENTO_META.md`, seção 9. É a primeira linha de recuperação.

> **Escopo atual:** no MVP entram só a camada 1 (remarketing) e a camada 4 (recuperação na tela). O produto não usa e-mail. As camadas 2 e 3 (WhatsApp) ficam especificadas para uma fase futura, se o Rob decidir.

## 2. Captura opcional de contato (com consentimento) — fase futura

### Onde aparece

| Momento | Texto da oferta | Campo |
|---|---|---|
| Depois do resultado grátis (antes da oferta paga) | "Quer guardar seu resultado? Receba o link no seu WhatsApp." | WhatsApp |
| Tela do Pix, abaixo do QR Code | "Receba o seu link e o comprovante também no WhatsApp." | WhatsApp |
| Pix expirado | "Prefere pagar depois? Te mandamos o link do seu resultado salvo." | WhatsApp |

### Consentimento (duas caixas, separadas)
1. **"Quero receber o link do meu resultado"** — obrigatória para salvar o número; é a finalidade principal.
2. **"Quero receber novidades e ofertas do Segredo do Nome"** — opcional, **desmarcada**.

Texto curto abaixo: "Você pode sair a qualquer momento respondendo SAIR ou pelo link na mensagem." Textos finais validados com o advogado.

O primeiro nome já existe no resultado; não pedimos de novo.

### O que é salvo
Exigiria uma tabela de contatos (hoje o projeto não guarda dados de clientes): número em formato internacional (+55...), origem, as duas decisões de consentimento com a versão do texto, status na fila, código de descadastro. Apagado em 30 dias se não houver compra, ou na hora com descadastro.

### Evento
`Lead` para a Meta (sem o número; ver `RASTREAMENTO_META.md`).

## 3. Fila de recuperação no painel (envio manual) — fase futura

| Fila | Quem entra | Quando aparece | Mensagem pronta |
|---|---|---|---|
| A — Pix não pago | Gerou Pix, deixou WhatsApp, não pagou | 30 min após gerar o Pix | Link do resultado salvo |
| B — Viu e não comprou | Deixou WhatsApp no resultado grátis, não gerou Pix | 24 h depois | Link do resultado salvo (+ oferta só se tiver o consentimento de ofertas) |

- Botão **"Abrir conversa"** abre `https://wa.me/{numero}?text={mensagem}` no WhatsApp do celular do Rob. Envio feito por um número **separado** do pessoal e do da agência, com WhatsApp Business.
- Depois de enviar, o Rob marca: `enviado`, `respondeu`, `comprou` ou `nao_contatar`.
- **Uma mensagem por contato** no piloto. Nada de sequência.
- Quem compra sai da fila sozinho.
- Toda mensagem termina com a forma de sair.

### Mensagens prontas (rascunho)

**Só link (consentimento de link):**
> Oi, {primeiro_nome}! Aqui é do Segredo do Nome. Seu resultado ficou salvo neste link: {link}. Se quiser, a versão completa continua disponível lá. Para não receber mais mensagens, responda SAIR.

**Com oferta (consentimento de link + ofertas):**
> Oi, {primeiro_nome}! Seu resultado de {arquetipo} ficou salvo: {link}. Na versão completa tem como você ama, o seu ponto cego e o seu 2027, trimestre a trimestre, por R$ 11,90 no Pix. Para não receber mais mensagens, responda SAIR.

Sem desconto de recuperação no piloto (para não ensinar o público a esperar). Se for testar incentivo, preferir bônus (ex.: um extra no PDF) e medir separado.

## 4. Recuperação na tela (MVP)
- Link de acesso (com QR Code e impresso no PDF) depois do pagamento; abre em qualquer aparelho por 12 meses.
- Perdeu o link: refazer o quiz com o mesmo nome e data localiza o pagamento no Mercado Pago.
- O aparelho lembra o resultado: ao voltar ao site, a landing mostra "seu resultado está salvo — abrir".
- Quem gerou Pix e não pagou e voltar ao site cai direto no resultado salvo com o checkout pronto para gerar novo Pix.
- O público R6 (gerou Pix e não pagou) recebe anúncio de "seu resultado ficou salvo, é só voltar"; ao clicar, o aparelho reconhece o resultado.
- Detalhes: `ESPECIFICACAO.md`, seção 6.1.

## 5. Evolução (só se o manual mostrar retorno)
- WhatsApp Cloud API oficial da Meta, com modelos de mensagem aprovados e envio automático pelo Worker. Custos por mensagem conforme a tabela vigente da Meta.
- Nunca usar bibliotecas não oficiais nem disparo em massa por número comum.

## 6. Métricas no painel
Contatos capturados por origem, taxa de captura (contatos ÷ resultados vistos), mensagens enviadas, respostas, compras recuperadas (compra depois do contato) e receita recuperada.
