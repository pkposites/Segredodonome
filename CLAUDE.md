# CLAUDE.md — Segredo do Nome

Instruções para o Claude Code neste repositório. Leia este arquivo e toda a pasta `docs/` antes de programar.

## Contexto em 6 linhas

- Produto de entretenimento: quiz "Segredo do Nome" com resultado gratuito completo e resultado expandido pago (R$ 11,90 via Pix, Mercado Pago).
- Dono: Rob, gestor de tráfego. Já integrou o Mercado Pago (Developers) em outros projetos. Não é desenvolvedor em tempo integral: prefira soluções simples, explicadas passo a passo.
- MVP = só a trilha Nome. A trilha Casal aparece na landing como "em breve".
- **Sem banco de dados de clientes.** O resultado é recalculado a cada abertura a partir de dados guardados no navegador da pessoa; o Mercado Pago é a fonte da verdade dos pagamentos. Ver `docs/ARQUITETURA.md`.
- Fonte da verdade do produto: `docs/ESPECIFICACAO.md`. Em conflito entre documentos, a especificação vence; aponte o conflito em vez de escolher em silêncio.
- Idioma de toda interface, textos e mensagens de erro: português do Brasil.

## Stack (fixa)

| Camada | Tecnologia |
|---|---|
| Front | HTML/CSS/JS sem framework, em `web/`, publicado no Netlify |
| API | Cloudflare Worker em `worker/` (TypeScript, Wrangler), ambientes `dev` e `production` |
| Pagamento | Mercado Pago, Pix pela API (conta e credenciais do Rob; confirmar endpoints vigentes em mercadopago.com.br/developers) |
| Medição | Meta Pixel + API de Conversões (no Worker), deduplicados por `event_id` |
| Armazenamento mínimo | **Cloudflare D1** (banco da própria Cloudflare, ligado ao Worker) **só** para: registros de acesso do Marco Civil (6 meses), contadores do funil sem pessoa, gasto de mídia digitado no painel e configurações. Nenhum dado de cliente. Migrações em `worker/migrations/` |
| Painel | `web/painel/` + endpoints `/admin/*`, protegidos pelo **Cloudflare Access** (login por e-mail do Rob com código). Sem Supabase |

Não troque a stack nem adicione framework/serviço pago sem aprovação.

## Regras de trabalho

1. **Plano antes de código.** Para cada fase: liste arquivos, dependências, migrações, riscos e o que precisa de credencial. Espere aprovação.
2. **Nada irreversível sem aprovação:** aplicar migração em projeto remoto, criar recurso na nuvem, publicar, criar cobrança real, mexer em campanha.
3. **Segredos nunca no código, no chat, em logs ou no front.** Use `wrangler secret`, `.dev.vars` (no `.gitignore`) e variáveis protegidas do Netlify. Se precisar de um segredo, diga o nome da variável e onde o Rob deve cadastrá-la.
4. **Uma fase por vez** (`docs/FASES.md`). Não construa nada marcado como "depois do MVP".
5. **Testes junto com o código.** Cálculo, criptografia do passe, preço, webhook e autorização exigem testes automatizados (Vitest no Worker). Rode antes de dizer que terminou.
6. **Nunca invente:** endpoints e campos do Mercado Pago, regras da Meta, números de mercado ou aprovação jurídica. Na dúvida, consulte a documentação oficial e cite o link.
7. **Ao terminar cada fase:** resumo curto do que foi feito, como testar manualmente, como fazer rollback e o que ficou pendente.

## Regras de produto que não podem ser quebradas

- **Não guardar dados de clientes no servidor.** Nome, data de nascimento, respostas, e-mail e resultados só existem: no navegador da pessoa, dentro do passe criptografado (que só o Worker abre) e em memória durante uma requisição. Nenhuma tabela, log ou ferramenta de terceiros recebe esses dados.
- O e-mail que o Mercado Pago exige para gerar o Pix é repassado direto ao Mercado Pago e descartado. Nunca vai para log, banco, Pixel ou API de Conversões.
- Conteúdo pago nunca vai para o HTML, bundle ou JSON público. Só o Worker monta o conteúdo pago, e só depois de confirmar no Mercado Pago que o pagamento está aprovado (e não estornado).
- Pagamento só é confirmado consultando a API do Mercado Pago no servidor. Nunca pelo front.
- Preço calculado sempre no servidor.
- Nenhum dado pessoal vai para Pixel, UTMs, URLs ou logs. Na API de Conversões, só o que está em `docs/RASTREAMENTO_META.md`.
- Pixel limpo: **só eventos padrão da Meta e só parâmetros padrão**, eventos automáticos desligados (`autoConfig` false). Qualquer evento novo exige aprovação.
- Toda venda gera um `Purchase` do servidor com `event_id` derivado do ID do pagamento, igual ao do Pixel.
- Mesma versão do algoritmo + mesmas entradas = mesmo resultado. Nada sorteado com `Math.random()` no cálculo.
- Sem escassez falsa, cronômetro falso, preço riscado falso, prova social inventada ou "estatística de raridade" sem base real.
- Não apresentar o produto como ciência, avaliação psicológica ou previsão do futuro. A palavra "numerologia" não aparece na interface, mas a metodologia não é escondida nem descrita como validada.

## Textos jurídicos
Os textos de `legal/` são a fonte das páginas `/termos`, `/privacidade`, `/reembolso`, do aviso de cookies e das caixas de consentimento. Não reescreva por conta própria; aponte se algo no sistema contradizer um texto.

## Convenções

- Tabelas só as de `worker/migrations/` (D1). Colunas em `snake_case`.
- Todo resultado carrega `algorithm_version` e `content_version`.
- Front: `textContent` para texto dinâmico (nunca `innerHTML` com dado de usuário). CSP restrita.
- Acessibilidade: contraste AA, foco visível, `prefers-reduced-motion` respeitado, toda animação pode ser pulada.
- Mobile primeiro (360–430px).

## Comandos (a definir na Fase 1)

Documente aqui, quando existirem: instalar, rodar local, testar, deploy do Worker, deploy do front, migração.
