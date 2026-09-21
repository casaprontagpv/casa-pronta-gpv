# Lacunas funcionais conhecidas

Coisas que o sistema **não faz** e que quem olha o produto de fora costuma supor que ele faça.

**Decisão do cliente (2026-09-21):** nenhuma delas entra no escopo agora. O objetivo é apresentar o
projeto no escopo funcional atual e deixar que o uso real revele quais dessas lacunas são de fato
necessárias. Este documento existe para que nenhuma seja descoberta por acidente, numa demonstração.

Levantadas por leitura do código do protótipo; permanecem válidas depois da migração para
Supabase, porque a migração preserva o comportamento — ela não adiciona regra de negócio nova.

---

## Operação

**Não existe SLA nem prazo.** Nenhum chamado vence. Não há alerta de atraso, nem relógio correndo,
nem escalonamento. `PriorityLevel` (`emergencial | alta | normal | baixa`) é **rótulo visual**:
muda a cor do badge e o tipo da notificação, e nada mais. Um chamado `emergencial` não notifica
ninguém de forma diferente, não fura fila e não aparece separado.

**Não há acompanhamento de garantia.** `ServiceCompletion.warrantyMonths` (padrão de 3 meses) é
gravado e exibido. O sistema não avisa quando vence, não bloqueia cobrança dentro do período e não
vincula um chamado novo a um reparo antigo ainda em garantia — se o mesmo problema voltar, vira um
chamado comum, sem relação com o anterior.

**Não há reabertura de chamado.** Depois de `concluido`, o caminho é abrir outro chamado do zero.

**Não há chamado recorrente nem manutenção preventiva.** Tudo é reativo: alguém precisa relatar
um problema.

---

## Financeiro

**Não há alçada de aprovação.** Um orçamento de R$ 50 e um de R$ 50.000 seguem exatamente o mesmo
fluxo, com o mesmo aprovador.

**Não existe o proprietário do imóvel no modelo.** Os atores são inquilino, imobiliária, prestadora
e técnico. Se o dono do imóvel precisar aprovar gastos acima de certo valor — cenário comum em
administração de locação — isso não tem onde acontecer.

**O "Faturamento" do dashboard não é receita.** É a soma de `quote.totalCost` de **todos** os
chamados, aprovados ou não, concluídos ou não. É valor orçado. Não há nota fiscal, cobrança,
repasse, pagamento, nem qualquer noção de recebimento.

**Não há impostos, descontos, taxa de administração nem margem.** `totalCost` é exatamente
`materialsCost + laborCost`.

---

## Dados e relatórios

**As métricas da imobiliária são números fixos no código.** A aba "Métricas & Indicadores"
(`AgencyView`) mostra 1.8 dias, 92.4%, 4.9★, -80% e uma distribuição por categoria — todos
hardcoded, nenhum calculado. Com dados reais no Postgres eles passam a ser **calculáveis**, mas
calculá-los é trabalho adicional, fora das 8 etapas da migração.

**Não há exportação nem relatório.** Sem PDF do orçamento, sem PDF do laudo técnico, sem CSV de
chamados, sem impressão.

**Não há busca global.** A busca existe dentro de cada portal, sobre a lista já filtrada.

---

## Comunicação

**As notificações são apenas in-app.** Sem e-mail, sem push, sem WhatsApp. Quem não abrir o sistema
não fica sabendo de nada — inclusive o inquilino, que é justamente quem menos abre.

**O chat não aceita anexo.** `ChatMessage.attachments` existe no tipo e nunca é preenchido nem
exibido. Só o chamado, o parecer e a conclusão aceitam foto.

---

## Modelagem

**O status `aguardando_aprovacao` é órfão.** Está no enum `TicketStatus`, tem rótulo e cor em
`getStatusConfig`, e **nenhuma ação do sistema o atribui**. Na prática, `orcamento_enviado` já
significa "aguardando aprovação". Resolver seria remover o status ou dar função a ele — mas mexer
em enum de estado tem efeito em cascata (ver §13 do `CLAUDE.md`).

**O status `pendente` existe mas não tem fluxo.** Serve para "precisa de peça / precisa de retorno",
mas nenhuma tela o define e nada o resolve.

**Um imóvel tem um endereço em texto livre.** Sem CEP validado, sem geocodificação, sem unidade
estruturada. Dois cadastros do mesmo imóvel com grafias diferentes viram dois imóveis — e o
"prontuário por imóvel", que agrupa por endereço, se parte em dois.

> O plano de migração corrige parte disso ao criar a tabela `properties` com chave real, o que já
> impede o prontuário de se fragmentar. Endereço continua texto livre.
