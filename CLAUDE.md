# CLAUDE.md — Casa Pronta · Gestão de Manutenções

Documento de referência para qualquer agente/dev que trabalhe neste repositório.
Contém **o domínio e as regras de negócio** do sistema (a parte que não pode se perder),
a arquitetura atual do código e o estado real de maturidade do projeto.

> ⚠️ Este projeto nasceu como um protótipo gerado no **Google AI Studio** e foi extraído de um ZIP.
> Ele é hoje um **protótipo funcional de front-end com dados em memória/localStorage** — não um sistema de produção.
> A seção [Estado atual vs. Produção](#10-estado-atual-vs-produção) lista exatamente o que falta.

**Documentos irmãos:**

- [`docs/PLANO-MIGRACAO.md`](docs/PLANO-MIGRACAO.md) — plano aprovado de migração para Vercel + Supabase (arquitetura alvo, schema, RLS, 8 etapas).
- [`docs/LACUNAS-FUNCIONAIS.md`](docs/LACUNAS-FUNCIONAIS.md) — o que o sistema **não** faz, por decisão (SLA, garantia, alçada, faturamento, relatórios…).
- [`docs/GUIA-GOOGLE-CLOUD.md`](docs/GUIA-GOOGLE-CLOUD.md) — limpeza do projeto Google herdado do AI Studio.

---

## 1. O que é o sistema

Plataforma web (PWA) que organiza o ciclo completo de **manutenção predial em imóveis de locação**,
substituindo a coordenação informal por WhatsApp entre quatro atores:

| Ator                                           | Papel no negócio                                                                                                           |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Inquilino** (`inquilino`)                    | Mora no imóvel. Abre o chamado, acompanha, confirma presença, atesta a execução e avalia.                                  |
| **Imobiliária** (`imobiliaria`)                | Administra a carteira de imóveis. Autoriza vistoria e **aprova/reprova orçamentos** (é quem paga/repassa ao proprietário). |
| **Empresa prestadora** (`empresa`)             | "Casa Pronta". Central de operações: triagem, designação de técnico, orçamento, agenda, roteirização.                      |
| **Prestador / Técnico de campo** (`prestador`) | Executa em campo: vistoria, parecer técnico, execução, registro de conclusão com fotos.                                    |

Proposta de valor central: **linha do tempo única e auditável por chamado**, visível a todos os
envolvidos, com orçamento transparente e histórico permanente por imóvel ("prontuário").

Idioma do produto: **pt-BR**. Moeda: **BRL**. Fuso: **America/Sao_Paulo**.

---

## 2. Stack e comandos

|              |                                                                  |
| ------------ | ---------------------------------------------------------------- |
| Build        | Vite 6                                                           |
| UI           | React 19 + TypeScript 5.8                                        |
| Estilo       | Tailwind CSS v4 (via `@tailwindcss/vite`, sem `tailwind.config`) |
| Ícones       | `lucide-react`                                                   |
| Estado       | React Context único (`src/context/AppContext.tsx`)               |
| Testes       | Vitest + Testing Library (99 testes)                             |
| Persistência | **`localStorage` do navegador** (não há backend)                 |

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # vite build -> dist/
npm run typecheck    # tsc --noEmit (strict ligado)
npm run lint         # ESLint 9 flat config
npm run format       # Prettier
npm run test         # Vitest
npm run check        # typecheck + lint + test + build — o mesmo que o CI roda
```

Qualidade: TypeScript **strict**, ESLint + Prettier, Vitest e GitHub Actions (`.github/workflows/ci.yml`).
Não há Dockerfile — o alvo de deploy é a Vercel (build estático).

---

## 3. Mapa do código

```
index.html
src/
  main.tsx                      # bootstrap React + registro do Service Worker
  App.tsx                       # shell: Header + view do portal ativo + modais globais
  types.ts                      # ÚNICA fonte de verdade dos tipos de domínio — leia primeiro
  mockData.ts                   # seed de tickets/técnicos/agendamentos/notificações (demo)
  mockUsers.ts                  # PRESET_USERS — usuários e senhas de demonstração
  context/
    appContextTypes.ts          # AppContextType + a instância do contexto
    AppContext.tsx              # AppProvider — TODA a lógica de negócio e persistência
    useApp.ts                   # hook de acesso (arquivo próprio por causa do Fast Refresh)
  domain/                       # regras puras e testáveis, sem React
    access.ts                   # isolamento de dados por papel (§6) — espelha a futura RLS
    scheduling.ts               # conflito de agenda (§7) — vira constraint EXCLUDE no Postgres
  components/
    Header.tsx                  # troca de portal, notificações, sessão
    LoginPortal.tsx             # login/cadastro por papel
    views/
      TenantView.tsx            # portal do inquilino
      AgencyView.tsx            # portal da imobiliária (chamados / prontuário / métricas)
      CompanyView.tsx           # central da prestadora (dashboard / chamados / agenda / equipes)
      TechnicianView.tsx        # app de campo do técnico (rota do dia)
    TicketDetailModal.tsx       # detalhe do chamado: timeline, chat, orçamento, laudo, conclusão
    NewTicketModal.tsx          # abertura de chamado
    TechnicalReportModal.tsx    # parecer técnico
    QuoteModal.tsx              # criar orçamento / aprovar / reprovar
    ScheduleModal.tsx           # agendamento com detecção de conflito
    ServiceCompletionModal.tsx  # conclusão com fotos antes/depois e garantia
    EvaluationModal.tsx         # avaliação do inquilino
    TimelineViewer.tsx          # stepper visual das etapas
  utils/
    helpers.ts                  # labels, cores, formatação BRL, normalização, link WhatsApp
    id.ts                       # createId() — IDs únicos por entidade
  test/setup.ts                 # setup do Vitest
public/
  manifest.json, sw.js, icons   # PWA
```

Testes ficam ao lado do código: `*.test.ts` / `*.test.tsx`.

**Regra de ouro:** toda mutação de estado de domínio vive em `AppContext.tsx`.
Componentes nunca escrevem estado direto — chamam as ações do contexto.

**Segunda regra:** regra de negócio pura vai para `src/domain/`, não para dentro do componente.
Foi assim que a detecção de conflito deixou de estar duplicada entre o contexto e o `ScheduleModal`.
Cada módulo de `domain/` é a especificação executável de uma função/política que a Etapa 2
recria no Postgres — os dois lados precisam dizer a mesma coisa.

---

## 4. Entidades do domínio

Definidas em `src/types.ts`. Resumo das relações:

```
AuthUser ──┐
           ├── (inquilino) ──> vinculado a 1 imóvel (propertyAddress/propertyUnit/propertyCode)
           ├── (imobiliaria) ─> vinculada a agencyId/agencyName + cnpj
           ├── (empresa) ─────> acesso total
           └── (prestador) ───> vinculado a technicianId

MaintenanceTicket (agregado raiz)
  ├── timeline: TimelineEvent[]        (append-only — o histórico auditável)
  ├── chatMessages: ChatMessage[]
  ├── technicalReport?: TechnicalReport (0..1)
  ├── quote?: Quote                     (0..1)
  ├── appointment?: Appointment         (0..1 — cópia do Appointment global)
  ├── completion?: ServiceCompletion    (0..1)
  └── evaluation?: Evaluation           (0..1)

Appointment ──> technicianId ──> Technician
NotificationItem ──> targetRoles: UserRole[]  (fan-out por papel, não por usuário)
```

⚠️ **Duplicação conhecida:** `Appointment` existe tanto na lista global `appointments`
quanto embutido em `ticket.appointment`. As duas cópias precisam ser atualizadas juntas
(`syncAppointmentWithGoogle` e `finalizeService` fazem isso; `updateAppointmentStatus` **não** —
ver [§11 Bugs](#11-bugs-e-inconsistências-conhecidos)).

### Enumerações de domínio

- `UserRole`: `inquilino | imobiliaria | empresa | prestador`
- `TicketStatus`: `chamado_aberto | em_analise | aguardando_vistoria | orcamento_enviado | aguardando_aprovacao | orcamento_aprovado | orcamento_reprovado | servico_agendado | em_execucao | pendente | concluido | cancelado`
- `PriorityLevel`: `emergencial | alta | normal | baixa`
- `Category`: `eletrica | hidraulica | pintura | infiltracao | porta_fechadura | janela | revestimento_piso | telhado | outro`
- `PropertyType`: `apartamento | casa | sobrado | comercial | outro`
- `AppointmentStatus`: `agendado | confirmado | aguardando_confirmacao | em_deslocamento | em_atendimento | concluido | reagendar | cancelado | nao_realizado`
- `preferredPeriod` do chamado: `manha | tarde | integral | sabado`

Labels, cores e o número do passo (`step`) de cada status ficam em `utils/helpers.ts`
(`getStatusConfig`, `getPriorityConfig`, `getCategoryLabel`, `getPropertyTypeLabel`,
`getAppointmentStatusConfig`). **Nunca** escreva label de status hardcoded em componente.

---

## 5. Ciclo de vida do chamado (máquina de estados)

O caminho feliz, e quem dispara cada transição:

```
                [inquilino]                    [imobiliária]
  (abertura) ──> chamado_aberto ──────────────> em_analise
                                                     │ autoriza vistoria
                                                     ▼
                                              aguardando_vistoria
                                                     │ [prestador] salva parecer com needsQuote=true
                                                     ▼
                [empresa] envia orçamento ──> orcamento_enviado
                                               │                  │
                        [imobiliária] aprova   │                  │ [imobiliária] reprova (motivo obrigatório)
                                               ▼                  ▼
                                      orcamento_aprovado   orcamento_reprovado
                                               │
                  [empresa] agenda (sem conflito de técnico)
                                               ▼
                                       servico_agendado
                                               │ [prestador] inicia atendimento
                                               ▼
                                          em_execucao
                                               │ [prestador] registra conclusão (fotos antes/depois + garantia)
                                               ▼
                                           concluido
                                               │
                        [inquilino] confirma realização  ──> completion.tenantConfirmed = true
                        [inquilino] avalia (1..5)        ──> evaluation
```

Estados laterais: `pendente` (precisa de retorno/peça), `cancelado`, `aguardando_aprovacao`
(declarado no tipo e com label, mas **nenhuma ação do sistema o define hoje**).

### Regras de transição (implementadas em `AppContext`)

1. **Toda** mudança de status acrescenta um `TimelineEvent` (append-only) e atualiza
   `updatedAt` / `lastActionAt`. A timeline nunca é editada nem removida.
2. **Toda** mudança relevante dispara uma `NotificationItem` direcionada por papel.
3. O parecer técnico (`saveTechnicalReport`) move o chamado para `aguardando_vistoria`
   **somente se** `needsQuote === true`; caso contrário preserva o status atual.
   Ele também **sobrescreve a prioridade do chamado** com `recommendedPriority` do técnico.
4. `submitQuote` força o status para `orcamento_enviado` e cria o `Quote` com `status: 'enviado'`.
5. `reviewQuote('reprovar')` **exige motivo** (validado no `QuoteModal`) e grava `rejectionReason` + `rejectedAt`.
6. `scheduleAppointment` só cria o agendamento se **não houver conflito** (ver §7); em caso de
   sucesso, vincula o técnico ao chamado e move para `servico_agendado`.
7. `finalizeService` move para `concluido` e também marca o `Appointment` correspondente como `concluido`.
8. `confirmTenantCompletion` **não** muda o status — só marca `completion.tenantConfirmed`
   e registra na timeline. É o "aceite" do inquilino.
9. `submitEvaluation` também não muda status; anexa a avaliação e registra na timeline.

> ⚠️ Não há hoje nenhuma validação que **impeça** uma transição fora de ordem: as ações estão
> escondidas na UI conforme o status, mas `updateTicketStatus` aceita qualquer destino.
> Ao migrar para backend, a máquina de estados precisa ser validada no servidor.

---

## 6. Isolamento de dados (multi-tenant) — regra crítica

Implementado hoje apenas como filtro client-side em `AppContext` (`userTickets` / `userAppointments`).
**A intenção de negócio é rígida** e precisa ser preservada (e, em produção, aplicada via RLS no banco):

| Papel         | Enxerga                                                          | NÃO pode enxergar                                                              |
| ------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `inquilino`   | Somente chamados/agendamentos **do seu imóvel**                  | Outros imóveis, carteira da imobiliária, dashboard e faturamento da prestadora |
| `imobiliaria` | Somente chamados dos imóveis **sob sua gestão** (`agencyId`)     | Imóveis de outras imobiliárias, faturamento interno e margens da prestadora    |
| `empresa`     | **Tudo**: todos os chamados, agenda global, equipes, faturamento | —                                                                              |
| `prestador`   | Chamados/agendamentos **atribuídos a ele**                       | Faturamento, carteira comercial                                                |

⚠️ O casamento hoje é **heurístico e frouxo** — compara nome/endereço por `includes()` de string,
e o filtro do técnico tem um fallback literal `includes('carlos')`. Isso é aceitável em demo e
**inaceitável em produção**: deve virar chave estrangeira (`tenant_id`, `agency_id`, `technician_id`)
e política RLS.

Observação de UI: `App.tsx` só renderiza a view se `currentUser.role === activePortalTab`;
caso contrário mostra o `LoginPortal`. Isso é _gating_ visual, não segurança.

---

## 7. Regras de agendamento

- Um `Appointment` tem `date` (`YYYY-MM-DD`), `startTime` e `endTime` (`HH:MM`, string).
- **Detecção de conflito** (`scheduleAppointment`): existe conflito quando, para o **mesmo técnico**
  e **mesma data**, há sobreposição de janelas — `novoInicio < fimExistente && novoFim > inicioExistente` —
  ignorando agendamentos com status `cancelado` ou `nao_realizado`.
  Havendo conflito, a criação é **recusada** e o agendamento conflitante é devolvido para exibição.
- `ScheduleModal` também valida `startTime < endTime` e mostra um aviso de conflito em tempo real
  enquanto o operador escolhe técnico/horário.
- A grade da agenda da prestadora cobre **08:00–17:00** (`CompanyView`).
- O inquilino pode **confirmar presença** (`updateAppointmentStatus(id, 'confirmado')`),
  o que seta `tenantConfirmed = true` e notifica empresa + técnico.

---

## 8. Regras financeiras (orçamento)

- `Quote.totalCost` = `materialsCost + laborCost`. Não há imposto, desconto nem taxa de administração.
- Campos obrigatórios de negócio: descrição do serviço, resumo de materiais, resumo de mão de obra,
  os dois custos e `executionDeadlineDays`.
- Estados do orçamento: `enviado → aprovado | reprovado`. Reprovação exige `rejectionReason`.
- **Quem aprova é a imobiliária** (a UI também libera para `empresa`, por conveniência operacional).
- `CompanyView` calcula "Faturamento" como a **soma de `quote.totalCost` de todos os chamados**,
  independentemente de aprovação ou conclusão — é uma métrica de _valor orçado_, não de receita realizada.
- Formatação monetária sempre via `formatCurrency()` (`Intl.NumberFormat pt-BR / BRL`).

---

## 9. Outras regras

**Protocolo do chamado.** `protocol = '#' + (1030 + tickets.length)` e `id = 't-' + numero`.
Sequencial derivado do tamanho do array — **colide** assim que houver concorrência.
Em produção deve virar sequência no banco.

**Garantia.** `ServiceCompletion.warrantyMonths` — padrão sugerido de **3 meses** no formulário.
É registrado e exibido, mas o sistema **não** faz nada automático ao vencer.

**Avaliação.** Nota de **1 a 5** estrelas + três booleanos (`solved`, `satisfactory`, `punctual`)

- comentário livre. Só faz sentido após `concluido`. Alimenta o CSAT exibido à imobiliária.

**Notificações.** São in-app, por **papel** (`targetRoles: UserRole[]`), não por usuário.
O `timestamp` das notificações criadas em runtime é a string literal `'Agora mesmo'`.

**Datas.** Todas as datas de domínio (`createdAt`, `updatedAt`, timeline, orçamento…) são gravadas
como **string formatada pt-BR** (`"14/09/2025 às 13:26"`), não ISO. Isso impede ordenação e cálculo.
Exceção: `Appointment.date` é ISO `YYYY-MM-DD`. Ao migrar, padronizar tudo para `timestamptz`.

**Fotos.** São `string[]`. Podem ser URL do Unsplash (seed) **ou data-URI base64** do upload do
usuário (`FileReader.readAsDataURL` em `NewTicketModal`). Vão inteiras para o `localStorage` —
estouram a cota (~5 MB) rapidamente. Em produção: object storage + URL assinada.

**Métricas da imobiliária.** Os números da aba "Métricas & Indicadores" (`AgencyView`)
— 1.8 dias, 92.4%, 4.9★, -80%, distribuição por categoria — são **hardcoded**, não calculados.

---

## 10. Estado atual vs. Produção

> **Etapa 1 da migração concluída** (2026-09-21). As amarras do Google AI Studio saíram, os defeitos
> conhecidos foram corrigidos e o projeto tem strict mode, lint, testes e CI.
> Ver [`docs/PLANO-MIGRACAO.md`](docs/PLANO-MIGRACAO.md) para as etapas 2–8.

### O que já é real e funciona

Todos os fluxos de UI dos 4 portais; máquina de estados do chamado; detecção de conflito de agenda;
timeline auditável; chat por chamado; upload de fotos; PWA instalável com service worker;
deep links de WhatsApp e Google Maps.

### O que é simulação e precisa ser substituído

| Área             | Situação hoje                                                                                                                       |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Autenticação** | Demonstração. `login()` casa identificador exato + senha em texto puro de `mockUsers.ts`. Vira Supabase Auth na Etapa 3.            |
| **Autorização**  | Só filtro client-side (`src/domain/access.ts`). Quem abrir o DevTools vê tudo. Vira RLS no Postgres na Etapa 2.                     |
| **Persistência** | `localStorage` por navegador. Nada é compartilhado entre usuários — o "chat" e a "timeline" só existem na máquina de quem escreveu. |
| **Arquivos**     | Base64 dentro do `localStorage`. Vira Supabase Storage na Etapa 5.                                                                  |
| **Notificações** | Só in-app, na sessão local, direcionadas por papel. Sem e-mail, push ou WhatsApp.                                                   |
| **Dados**        | `mockData.ts` + `mockUsers.ts` são o seed; há botão "Resetar Dados" no header.                                                      |
| **Deploy**       | Sem `vercel.json` e sem rewrite de SPA. Etapa 8.                                                                                    |

### Amarras do Google AI Studio — todas removidas na Etapa 1

`README.md` do template, `.env.example` com `GEMINI_API_KEY`, `metadata.json`, `DISABLE_HMR` no
`vite.config.ts`, `firebase-applet-config.json`, dependências declaradas e nunca importadas
(`@google/genai`, `express`, `dotenv`, `motion`, `autoprefixer`, `tsx`, `esbuild`), e o nome de
pacote `react-example`. Faltam `@types/react`/`@types/react-dom`? Não mais — sem eles o `tsc`
tratava o app inteiro como `any` e mascarava todo erro de tipo.

Pendência fora do repositório: apagar o projeto Google `gen-lang-client-…`.
Ver [`docs/GUIA-GOOGLE-CLOUD.md`](docs/GUIA-GOOGLE-CLOUD.md).

---

## 11. Defeitos corrigidos na Etapa 1

Registro do que estava errado, para que não volte. Cada item marcado com 🧪 tem teste de regressão.

**Isolamento de dados e identidade**

1. 🧪 `login()` aceitava as senhas universais `123` e `admin` para qualquer usuário, e casava
   credencial por **fragmento de nome** (`name.includes(input)`) — digitar "cost" entrava como
   Mariana Costa. Agora é identificador exato + senha correspondente.
2. 🧪 O filtro do inquilino comparava endereço com `includes()` bidirecional: "Rua das Acácias, 450 -
   Apto 402" casava com "…Apto 201" e **expunha o chamado do vizinho**. Agora é igualdade normalizada.
3. 🧪 O filtro do técnico tinha um fallback literal `includes('carlos')` — qualquer outro técnico
   via agenda vazia, e qualquer técnico chamado Carlos via a agenda alheia.
4. 🧪 `getAuthorName()` devolvia nomes fixos por papel; toda a autoria da timeline e do chat
   ignorava quem estava logado — o que destruía o valor da timeline como registro auditável.
5. `AuthUser` não tinha campo `password`, mas o contexto lia e gravava um. Usuário cadastrado no app
   nunca tinha a senha validada. Virou `DemoUser.demoPassword`, e a senha é removida do objeto
   exposto ao restante do app.

**Dados fabricados em formulário**

6. `NewTicketModal` vinha pré-preenchido com nome, telefone e endereço da Mariana Costa — um
   inquilino registrava chamado no nome de outra pessoa. Agora parte do usuário logado.
7. `TechnicalReportModal` vinha com um diagnóstico hidráulico fictício completo: o técnico podia
   salvar na timeline um parecer que nunca escreveu.
8. `QuoteModal` vinha com R$ 140 / R$ 220 e textos genéricos — a imobiliária podia aprovar um
   orçamento que ninguém orçou. `ServiceCompletionModal` idem.
9. `registerUser` inventava endereço e imobiliária padrão quando o campo vinha vazio, fazendo o
   novo usuário herdar os chamados de outra pessoa pelo próprio filtro de isolamento.

**Correção e consistência**

10. 🧪 IDs eram `` `${prefixo}-${Date.now()}` `` e **colidiam** quando duas entidades nasciam no mesmo
    milissegundo — o que acontece sempre, já que uma ação cria registro + timeline + notificação de
    uma vez. Um chamado de 9 eventos tinha 5 IDs distintos. Virou `createId()` em `utils/id.ts`.
11. 🧪 O protocolo era `1030 + tickets.length` e repetia após um reset de dados. Agora deriva do
    maior protocolo existente.
12. 🧪 `updateAppointmentStatus` atualizava a lista global mas não a cópia em `ticket.appointment`;
    as duas divergiam ("Confirmar Presença" sumia da lista e continuava no detalhe do chamado).
13. `TechnicianView` gravava o status `'em_andamento'`, que não existe em `AppointmentStatus`.
14. `CompanyView` lia `tech.completedJobs`, campo inexistente em `Technician`.
15. `App.tsx` lia `selectedTicketId` do contexto, que nunca expôs esse campo.
16. `sw.js` era cache-first para tudo, inclusive o HTML de navegação — após um deploy o app servia
    o `index.html` antigo, apontando para um bundle que não existe mais. Agora é network-first
    para navegação e cache-first só para `/assets/*`, que tem hash no nome.
17. Os 8 `alert()`/`confirm()` nativos viraram feedback na própria interface.
18. Um e-mail pessoal real estava hardcoded em `LoginPortal.tsx` como conta Google padrão.

---

## 12. Integrações externas

Só restam deep links — nenhuma API, chave ou OAuth. É deliberado: o Google Calendar e o login com
Google saíram do escopo em 2026-09-21 e estão no backlog (`docs/PLANO-MIGRACAO.md` §10).

**WhatsApp** — `generateWhatsAppLink()` monta `https://wa.me/55<digits>?text=…`. Usado no chat do
técnico com o inquilino e no compartilhamento de status pelo detalhe do chamado.

**Google Maps** — `google.com/maps/search/?api=1&query=<endereço>`, na rota do dia do técnico.

**PWA** — `manifest.json` (id `com.casapronta.manutencao`, standalone, portrait, atalhos para
"Novo Chamado" e "Minha Agenda") e `sw.js` (network-first para navegação, cache-first para
`/assets/*`, que tem hash no nome).

> Se for retomar o Google Calendar: o código antigo está no histórico do git, mas o plano recomenda
> reimplementar com **service account** no servidor, não com OAuth no navegador — assim a
> sincronização não depende de cada usuário conectar a própria conta.

---

## 13. Convenções de código

- Componentes: `React.FC<Props>` com interface `Props` nomeada logo acima; export **nomeado**
  (exceto `App`, que é default).
- Arquivos em `PascalCase.tsx` para componentes, `camelCase.ts` para serviços/utils.
- Estilo: **Tailwind inline**, sem CSS modules nem styled-components. `src/index.css` só importa o Tailwind.
- Paleta por portal — mantenha a consistência: **inquilino = emerald**, **imobiliária = purple**,
  **empresa = indigo**, **prestador = cyan/slate**.
- Todo texto de interface em **português do Brasil**.
- Identificadores de domínio (status, papéis, categorias) em **português sem acento, snake_case**
  (`orcamento_aprovado`) — nomes de variáveis e funções em inglês.
- IDs **sempre** via `createId(prefixo)` de `utils/id.ts` — nunca `Date.now()` direto, que colide
  quando duas entidades nascem no mesmo milissegundo. Prefixos: `t-`, `tl-`, `msg-`, `rep-`, `qt-`,
  `apt-`, `comp-`, `eval-`, `notif-`.
- Feedback de ação é **UI**, nunca `alert()`/`confirm()` — o ESLint recusa (`no-alert`).
- Formulário **não** inventa dado: campo sem valor nasce vazio. Um default plausível vira registro
  permanente na timeline ou um orçamento que ninguém orçou (ver §11).
- `any` é erro de lint. Se o tipo é difícil, o problema costuma ser a modelagem.
- Ao adicionar um `TicketStatus` ou `AppointmentStatus`, atualize **obrigatoriamente**:
  `types.ts` → `utils/helpers.ts` (label/cor/step) → `statusTitles` em `AppContext.updateTicketStatus`
  → filtros de `<select>` em `AgencyView`/`CompanyView` → `TimelineViewer`.

---

## 14. Ao evoluir este projeto

- **Não** introduza dependência de Google AI Studio, Gemini ou Firebase. O objetivo declarado da
  refatoração é desacoplar o app de qualquer stack proprietária.
- Ao portar para backend: `AppContext` é a especificação executável do domínio. Cada ação dele
  (`createTicket`, `submitQuote`, `reviewQuote`, `scheduleAppointment`, `finalizeService`…) vira
  um caso de uso no servidor, com a mesma validação **mais** a autorização que hoje não existe.
- Preserve o isolamento por papel da §6 — é requisito de negócio, não detalhe de implementação.
- Preserve a timeline append-only — é o diferencial do produto.
