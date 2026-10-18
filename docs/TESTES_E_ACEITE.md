# Testes e critérios de aceite

## Motor (automatizados, Vitest)
- Determinismo: 1.000 entradas aleatórias rodadas duas vezes geram resultados idênticos.
- Normalização: "Ana  Paula", "ana paula", "Ána Paula", "Ana-Paula" → mesmo nome normalizado. "Maria da Silva" = "Maria Silva".
- Redução: sempre até 1–9 (29 → 2, 38 → 2, 22 → 4, 49 → 4); casos de 1 a 999 conferidos com tabela.
- Distribuição: com ~2.000 nomes brasileiros comuns + datas variadas, nenhum arquétipo passa de 15% nem fica abaixo de 8% (protótipo em Python deu de 10,3% a 12,4%).
- Temperamento: nunca empata; trocar 1 resposta muda no máximo 1 eixo.
- Semente: mesma pessoa → mesmas redações; mudar só a data muda a semente.
- Conteúdo: toda combinação tem texto; nenhuma variável `{...}` sem substituir.

## Passe e acesso (automatizados)
- Passe alterado em 1 byte → rejeitado. Passe vencido → só o grátis.
- Passe de uma pessoa enviado com entradas de outra → o completo continua sendo o do dono do passe.
- Pagamento com `external_reference` de outra chave, valor diferente de 11,90 ou status não aprovado → não libera.
- Pagamento estornado no Mercado Pago → próxima abertura mostra só o grátis.
- O passe nunca aparece na URL enviada ao servidor (só depois do `#`), em logs ou no Pixel.

## Sem dados no servidor (automatizados + revisão)
- Nenhuma tabela tem nome, data, respostas, e-mail ou texto de resultado.
- O e-mail do checkout não aparece em nenhum log do Worker, do D1 ou da Cloudflare, nem em payloads da Meta.
- `access_logs` (D1) guarda só IP, data/hora, método, rota sem query string e status.
- Registros com mais de 6 meses são apagados pelo agendamento.

## Pagamento (Mercado Pago, modo de teste)
- Compra aprovada → liberação na página em até 10 s, com comprovante e link de acesso.
- Pagar com a página fechada → ao abrir o link de acesso, já vem liberado; o Purchase do servidor chega à Meta.
- Abrir o link de acesso em outro aparelho → resultado completo.
- Limpar o navegador e refazer o quiz com o mesmo nome e data → o pago volta.
- Pix expirado → estado correto e novo Pix possível.
- Mesma `idempotency_key` duas vezes → um único pagamento.
- Webhook com assinatura inválida → 401. Webhook repetido → mesmo `event_id`, um Purchase na Meta.
- "Salvar em PDF" gera arquivo legível (sem fundo escuro, sem botões, com link e QR Code) no Chrome Android e no Safari iOS.

## Rastreamento Meta (Test Events)
- Só eventos padrão: PageView (em `/`, `/quiz`, `/quiz/parte-2`), ViewContent, AddToCart, AddToWishlist, InitiateCheckout, AddPaymentInfo e Purchase. Nenhum evento personalizado ou automático.
- Eventos por navegador e servidor marcados como deduplicados.
- `custom_data` só com parâmetros padrão; Purchase com `value` 11.90, `currency` BRL, `content_ids`, `contents`, `order_id` = ID do pagamento.
- `fbc` montado do `fbclid` quando o cookie `_fbc` não existe; `fbp`/`fbc` chegam no Purchase do webhook via `metadata`.
- Sem aceite de cookies: Pixel não carrega; eventos do servidor sem IP, user agent e `fbp`.

## Painel
- Cada etapa percorrida em teste soma 1 no contador certo; recarregar a página não soma de novo a mesma etapa na mesma sessão do navegador.
- Webhook repetido não soma duas vezes em "Pagaram".
- Custos por etapa = gasto digitado ÷ contador da etapa, conferidos à mão.
- Vendas do painel = painel do Mercado Pago no mesmo período.
- `/painel` e `/admin/*` sem passar pelo Cloudflare Access ou com e-mail fora da lista → bloqueado.

## Experiência (manual, celular real)
- iPhone (Safari) e Android (Chrome), 360 a 430px, sem rolagem horizontal, botões ≥ 44px.
- "Reduzir movimento" ligado: nenhuma animação obrigatória.
- Landing em menos de 2 s em 4G (Lighthouse mobile ≥ 85).
- Contraste AA no tema escuro.
- Menor de 18 anos → quiz não processado, nada enviado.

## Pronto para o piloto quando
Tudo acima passa, as minutas estão preenchidas e o Rob fez uma compra real e um reembolso real com sucesso.
