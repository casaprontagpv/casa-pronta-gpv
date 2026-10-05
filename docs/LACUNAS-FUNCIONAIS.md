# Lacunas funcionais conhecidas

O que o sistema **não faz** e que quem olha o produto de fora costuma supor que
ele faça. Nenhuma delas está no escopo atual: o produto é apresentado como está,
e o uso real dirá quais são mesmo necessárias.

Este documento existe para que nenhuma seja descoberta por acidente, numa
demonstração ou numa reunião de venda.

---

## Operação

**Não existe SLA nem prazo.** Nenhum chamado vence. Não há alerta de atraso, nem
relógio correndo, nem escalonamento. `PriorityLevel`
(`emergencial | alta | normal | baixa`) é **rótulo visual**: muda a cor do badge e
o tipo da notificação, e nada mais. Um chamado `emergencial` não notifica ninguém
de forma diferente, não fura fila e não aparece separado.

**Não há acompanhamento de garantia.** `ServiceCompletion.warrantyMonths` (padrão
de 3 meses) é gravado e exibido. O sistema não avisa quando vence, não bloqueia
cobrança dentro do período e não vincula um chamado novo a um reparo antigo ainda
em garantia — se o mesmo problema voltar, vira um chamado comum, sem relação com
o anterior.

**Não há reabertura de chamado.** Depois de `concluido`, o caminho é abrir outro
do zero.

**Não há chamado recorrente nem manutenção preventiva.** Tudo é reativo: alguém
precisa relatar um problema.

---

## Financeiro

**Não há alçada de aprovação.** Um orçamento de R$ 50 e um de R$ 50.000 seguem
exatamente o mesmo fluxo, com o mesmo aprovador.

**Não existe o proprietário do imóvel no modelo.** Os atores são inquilino,
imobiliária, prestadora e técnico. Se o dono do imóvel precisar aprovar gastos
acima de certo valor — cenário comum em administração de locação — isso não tem
onde acontecer.

**O "Faturamento" do dashboard não é receita.** É a soma de `quote.totalCost` de
**todos** os chamados, aprovados ou não, concluídos ou não. É valor orçado. Não
há nota fiscal, cobrança, repasse, pagamento, nem qualquer noção de recebimento.

**Não há impostos, descontos, taxa de administração nem margem.** `totalCost` é
exatamente `materialsCost + laborCost`.

---

## Dados e relatórios

**As métricas da imobiliária são números fixos no código.** A aba "Métricas &
Indicadores" (`AgencyView`) mostra 1.8 dias, 92.4%, 4.9★, -80% e uma distribuição
por categoria — todos hardcoded, nenhum calculado. Com os dados reais no Postgres
eles passam a ser calculáveis, mas calcular é trabalho que não foi feito.
**Não apresente esses números como reais.**

**Não há exportação nem relatório.** Sem PDF do orçamento, sem PDF do laudo
técnico, sem CSV de chamados, sem impressão.

**Não há busca global.** A busca existe dentro de cada portal, sobre a lista já
filtrada.

---

## Comunicação

**As notificações são apenas in-app.** Sem e-mail, sem push, sem WhatsApp. Quem
não abrir o sistema não fica sabendo de nada — inclusive o inquilino, que é
justamente quem menos abre. É a lacuna de maior impacto percebido.

**O chat não aceita anexo.** `ChatMessage.attachments` existe no tipo e nunca é
preenchido nem exibido. Só o chamado, o parecer e a conclusão aceitam foto.

---

## Modelagem

**O status `aguardando_aprovacao` é órfão.** Está no enum `TicketStatus`, tem
rótulo e cor, e **nenhuma ação do sistema o atribui**. Na prática,
`orcamento_enviado` já significa "aguardando aprovação". Resolver seria remover o
status ou dar função a ele — mexer em enum de estado tem efeito em cascata, ver a
lista de propagação no `CLAUDE.md`.

**O status `pendente` existe mas não tem fluxo.** Serve para "precisa de peça /
precisa de retorno", mas nenhuma tela o define e nada o resolve.

**O endereço do imóvel é texto livre.** Sem CEP validado, sem geocodificação, sem
unidade estruturada. O prontuário não se fragmenta, porque agrupa pela chave de
`properties` e não pelo endereço — mas dois cadastros do mesmo imóvel com
grafias diferentes continuam sendo dois imóveis.

---

## Backlog, por ordem de impacto

1. **Notificação por e-mail** nos eventos que importam ao inquilino. Depende de
   SMTP próprio, que já é pré-requisito do piloto.
2. **Notificação por WhatsApp** — maior impacto percebido, maior custo: exige a
   Cloud API da Meta, número verificado e templates aprovados.
3. **Métricas reais** no lugar dos números fixos da imobiliária.
4. **SLA, alçada de aprovação e controle de garantia.**
5. **Relatórios em PDF** de orçamento e laudo técnico.
6. **Push notification** — o service worker já existe.
7. **Sincronização com Google Agenda.** Reimplementar com _service account_ no
   servidor, não com OAuth no navegador: assim a sincronização não depende de
   cada usuário conectar a própria conta.
8. **Login com Google** — o Supabase Auth já suporta como provider; é
   configuração, não código.
9. **Publicação na Play Store (TWA)** — exige conta de desenvolvedor Google Play
   e o fingerprint SHA-256 real do keystore no `assetlinks.json`.
