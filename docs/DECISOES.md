# Registro de decisões

## Como ler
- **v0.1**: pré-documentação escrita com o Claude.
- **v0.2**: revisão externa por outra IA (PDF de 18/10/2026).
- **v0.3**: consolidação final (este pacote). Cada linha diz o que ficou e por quê.

## Decisões consolidadas

| Tema | v0.1 | v0.2 | v0.3 (vale) | Motivo |
|---|---|---|---|---|
| Escopo do MVP | Nome + Casal | Só Nome | **Só Nome**; Casal como "em breve" com lista de espera | Lançar mais rápido e medir demanda do Casal sem construir |
| Preço | R$ 11,90 + bump R$ 7 | Bump adiado | **R$ 11,90, sem bump** | Não vender trilha que não existe |
| Resultado grátis | Texto cortado no meio para gerar curiosidade | Grátis completo, sem frase cortada | **Grátis completo** + oferta de profundidade | Honestidade e menos reembolso |
| Prévia do pago | Borrão sobre o texto | Proibir borrão que simule conteúdo inexistente | **Primeira frase real visível + resto desfocado** | O texto pago existe e já está calculado; é prévia honesta |
| Raridade ("só X% têm") | Sim, estimada | Proibir | **Fora do MVP**; só volta com base real e rótulo claro | Evitar número sem base |
| Nome "como no documento" | Sim | Aceitar nome de uso | **Nome de uso, inclusive social** | Respeito e LGPD (minimização) |
| Gênero | Inferir pelo nome | Não inferir | **Pergunta opcional (Ela/Ele/Neutro)**; arquétipos com nomes neutros | Não inferir; nomes neutros evitam o problema |
| Nomes dos arquétipos | O Pioneiro, O Visionário… | — | **9 arquétipos: A Chama, A Ponte, A Voz, A Raiz, O Vento, O Abrigo, O Farol, O Leme, O Horizonte** | Neutros, mais compartilháveis, sem cara de horóscopo |
| Data de nascimento | Obrigatória | Questionar necessidade | **Obrigatória para calcular, descartada depois** | É base de 2 das 6 seções pagas; guardamos só o resultado |
| Chave para refazer | Hash de nome + data | Token aleatório + HMAC | **Token aleatório para acesso; HMAC com segredo para deduplicar** | Hash simples é previsível |
| Perguntas | 6, cada opção 1 polo | 4–6, documentar pesos | **5 perguntas, cada opção pontua os 2 eixos** | 5 votos por eixo nunca empatam; respostas aparecem no resultado |
| E-mail | Obrigatório antes do resultado | Opcional antes do grátis | **Nenhum e-mail enviado.** O Mercado Pago exige o e-mail do pagador para gerar o Pix: ele é repassado e descartado. Entrega, comprovante e recuperação na tela | Decisão do Rob: menos atrito, menos dado pessoal e um serviço a menos |
| Animação de processamento | 8–12 s | Evitar obrigatória | **Até 4 s, com "Pular" e respeito a movimento reduzido** | Valor percebido sem irritar |
| Rolagem automática | Sim | Evitar | **Botão "Continuar"** em vez de rolar sozinho | Controle do usuário |
| Recuperação de Pix | 15 min e 24 h | Cautela | **Na tela + remarketing (R6)**, sem e-mail | Decisão do Rob |
| "Numerologia" | Não citar, esconder método | Não esconder | **Não usar a palavra; explicar honestamente o método lúdico** | Transparência sem tom esotérico |
| Painel | Simples, com senha | Completo, MFA, 7 telas, importador Meta | **Login + MFA, 6 telas enxutas, gasto manual no MVP; importador na fase 3** | Segurança sem atrasar a primeira venda |
| Tabelas | 4 | 10 | **11** (`supabase/migrations/0001_init.sql`), incluindo histórico de transições, eventos do webhook e configuração | Controles de segurança/LGPD são baratos em SQL; o painel continua enxuto |
| Pixel/CAPI | Lead com e-mail | Sem PII | **Rastreamento completo no MVP (`RASTREAMENTO_META.md`): Purchase pelo servidor no webhook, deduplicado com o Pixel, pronto para bump/upsell; IP/user agent só até o envio; sem e-mail, portanto sem `em`** | A Meta precisa de compras corretas e bem correspondidas para otimizar; privacidade preservada |
| Evento de otimização | Lead | — | **InitiateCheckout no início, Purchase com volume** | Lead deixou de existir no fluxo |
| Números 11 e 22 | Arquétipos raros "mestres" | — | **Fora: tudo reduz para 1–9** | Teste com nomes reais mostrou que manter o 11 "engole" o 2 (A Ponte quase some) e o 22 praticamente nunca aparece. Com redução total, a distribuição fica entre 10% e 12,5% por arquétipo |
| Gateway de Pix | Mercado Pago | Mercado Pago | **Mercado Pago** (v0.4; Abacate Pay chegou a ser escolhido e foi trocado) | O Rob já domina o Mercado Pago Developers; taxa percentual menor que os R$ 0,80 fixos do Abacate Pay; permite achar pagamentos por `external_reference` (confirmar na Fase 0). Custo: pedir e-mail no checkout (repassado e descartado) |
| Dados de clientes | Banco com resultados e pedidos | Banco com PII minimizada | **Nenhum dado de cliente no servidor** (v0.4). Resultado recalculado; passe criptografado no navegador e no link; Mercado Pago como fonte da verdade; Cloudflare D1 só com registros de acesso (Marco Civil), contadores sem pessoa e gasto digitado; Supabase removido | Decisão do Rob: não guardar dados de ninguém |
| Eventos por etapa | Poucos eventos | — | **Só eventos padrão da Meta**: etapas do quiz separadas por URL real (`/quiz`, `/quiz/parte-2`) com `PageView`; depois `ViewContent`, `AddToCart`, `Lead`, `InitiateCheckout`, `AddPaymentInfo`, `Purchase`. Eventos automáticos e correspondência automática desligados; só parâmetros padrão | O Rob já recebeu reclamações da Meta por eventos fora do padrão; assim o Pixel fica limpo e os públicos R1–R6 continuam separados por etapa |
| Recuperação de vendas | E-mail 15 min e 24 h | Cautela | **Remarketing na Meta + recuperação na tela**; WhatsApp especificado para o futuro | Funciona sem travar o funil e sem coletar contato |
| E-mail transacional | Resend | — | **Fora** | Substituído pela entrega na tela e pelo link de acesso |
| WhatsApp | Recuperação | — | **Fora do MVP**; só um número de contato no rodapé (canal de atendimento) | Simplificar o lançamento |
| Idade | — | — | **Somente maiores de 18 anos** | Pagamento, LGPD (art. 14) e simplicidade |
| Logs de acesso | 30–90 dias | 30–90 dias | **6 meses** | Obrigação do Marco Civil da Internet, art. 15 |
| Teste de demanda | R$ 50/dia × 3 dias | Até R$ 150 se couber no caixa | **Até R$ 150, se couber no caixa** | Igual nas duas |

## Pendências humanas (o Rob decide)

Travam a Fase 1:
- [ ] Domínio e nome comercial definitivos
- [x] Conta Mercado Pago (Developers)
- [ ] Aplicação no Mercado Pago com credenciais de teste e de produção, e URL do webhook configurada
- [ ] Conta Cloudflare com Workers, D1 e Access (plano gratuito)

Travam o lançamento com dinheiro real:
- [x] Minutas jurídicas escritas (`legal/`)
- [ ] Preencher os campos `[...]` das minutas (razão social, CNPJ, endereço, contatos)
- [ ] Revisão rápida das minutas por advogado (recomendado)
- [ ] Contato de privacidade (e-mail do encarregado/canal de titulares)
- [ ] Percentual de taxa do Pix e imposto estimado para o painel
- [ ] Teto de gasto do teste
- [ ] Biblioteca de textos escrita e revisada (ver `content/GUIA_DE_CONTEUDO.md`)
- [ ] Criativos dos anúncios

Podem esperar:
- [x] Sem e-mail enviado e sem dados de clientes no servidor (decisão do Rob)
- [ ] Ordem das fases pós-MVP (Casal, card, indicação)
