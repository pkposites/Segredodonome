# Segredo do Nome — pacote de projeto (v0.4)

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
