# CLAUDE.md — Casa Pronta · Gestão de Manutenções

Documento de referência para qualquer agente/dev que trabalhe neste repositório.
Contém **o domínio e as regras de negócio** do sistema (a parte que não pode se perder),
a arquitetura atual do código e o estado real de maturidade do projeto.

> ⚠️ Este projeto nasceu como um protótipo gerado no **Google AI Studio** e foi extraído de um ZIP.
> Hoje ele roda sobre **Supabase** (Postgres com RLS, Auth, Storage e Realtime) e tem alvo de
> deploy na Vercel. O que já é real, o que continua sendo simulação e o que falta para publicar
> estão na seção [Estado atual vs. Produção](#10-estado-atual-vs-produção).

**Documentos irmãos:**

- [`docs/ESTADO-DO-PROJETO.md`](docs/ESTADO-DO-PROJETO.md) — **comece por aqui** para saber o que está pronto, o que falta e o que depende de uma ação do cliente. É de lá que saem as tarefas.
- [`docs/PLANO-MIGRACAO.md`](docs/PLANO-MIGRACAO.md) — plano aprovado de migração para Vercel + Supabase (arquitetura alvo, schema, RLS, etapas).
- [`docs/LACUNAS-FUNCIONAIS.md`](docs/LACUNAS-FUNCIONAIS.md) — o que o sistema **não** faz, por decisão (SLA, garantia, alçada, faturamento, relatórios…).
- [`docs/DEPLOY.md`](docs/DEPLOY.md) — runbook da Vercel, variáveis de ambiente e cabeçalhos de segurança.
- [`docs/PRIMEIRO-ADMIN.md`](docs/PRIMEIRO-ADMIN.md) — como nasce a primeira conta num banco vazio.
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
| Rotas        | `react-router-dom` 7 — o portal é derivado do papel da conta     |
| Estado       | React Context único (`src/context/AppContext.tsx`)               |
| Backend      | Supabase — Postgres, Auth, Storage privado e Realtime            |
| Servidor     | Vercel Functions (`api/`) — só o que exige `service_role`        |
| Persistência | **Postgres**, com RLS. Fotos em bucket privado                   |
| Testes       | Vitest + Testing Library (131) e pgTAP (57 asserções de banco)   |

```bash
npm install
npm run dev          # http://localhost:3000 — precisa do Supabase local no ar
npm run build        # vite build -> dist/
npm run typecheck    # tsc --noEmit (strict ligado)
npm run lint         # ESLint 9 flat config
npm run format       # Prettier
npm run test         # Vitest
npm run check        # typecheck + lint + test + build — o mesmo que o CI roda

npm run db:start:app # Supabase local: Postgres, Auth, REST, Storage, Realtime
npm run db:reset     # recria o banco a partir das migrations + seed
npm run db:test      # pgTAP, com reset antes e devolvendo a máquina como estava
npm run db:stop      # desliga os containers do projeto
npm run db:push      # publica as migrations no projeto remoto
```

> **Ordem entre as suítes.** O pgTAP mede contagens exatas contra o seed ("a inquilina
> enxerga EXATAMENTE 1 chamado"); as suítes de integração abrem chamados de verdade.
> Rode **pgTAP antes** da integração, ou `db:reset` entre as duas. O CI faz nessa ordem.

Qualidade: TypeScript **strict**, ESLint + Prettier, Vitest, pgTAP e GitHub Actions
(`.github/workflows/ci.yml`, dois jobs: front-end e banco).
Não há Dockerfile — o alvo de deploy é a Vercel; o Docker só roda o Supabase local.

---

## 3. Mapa do código

```
index.html
supabase/
  migrations/                   # A VERDADE do schema: tabelas, RLS, máquina de estados, RPCs
  tests/                        # pgTAP — isolamento, transições e conflito de agenda
  seed.sql                      # dados de demonstração; NÃO é aplicado em produção
api/
  admin/users.ts                # Vercel Function: criação de usuário (service_role)
  _lib/adminAuth.ts             # valida o JWT e lê o papel NO BANCO antes do service_role
  _lib/createUser.ts            # validação, senha temporária, chamada ao Auth
src/
  main.tsx                      # bootstrap React + registro do Service Worker
  App.tsx                       # shell: rotas, Header, view do portal, modais globais
  types.ts                      # ÚNICA fonte de verdade dos tipos de domínio — leia primeiro
  lib/
    supabase.ts                 # cliente do navegador (anon key)
    database.types.ts           # tipos gerados do schema (npm run db:types)
  auth/
    AuthProvider.tsx            # sessão, refresh de token, perfil do usuário
    ProtectedRoute.tsx          # barreira de rota por papel — gating visual, não segurança
    portalRoutes.ts             # papel -> rota do portal
  data/                         # acesso ao banco. NENHUMA consulta filtra por usuário: é a RLS
    tickets.ts                  # consultas e todas as RPCs, com erro já traduzido
    mappers.ts                  # linhas do Postgres -> agregado do domínio
    photos.ts                   # redução no cliente, upload, URL assinada
    realtime.ts                 # assinaturas ao vivo — o evento é SINAL, não dado
    datetime.ts                 # formatação pt-BR e conversão data+hora -> instante
  context/
    appContextTypes.ts          # AppContextType + a instância do contexto
    AppContext.tsx              # AppProvider — orquestra estado, ações e realtime
    useApp.ts                   # hook de acesso (arquivo próprio por causa do Fast Refresh)
  domain/
    scheduling.ts               # conflito de agenda (§7) — espelha a constraint EXCLUDE
  admin/                        # painel administrativo: imobiliárias, imóveis, inquilinos, técnicos
  pages/                        # LoginPage, AdminPage, recuperação e troca de senha
  components/
    Header.tsx                  # sessão, notificações, estado da conexão ao vivo
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
    photos/                     # galeria (resolve URL assinada) e seletor de fotos
  utils/
    helpers.ts                  # labels, cores, formatação BRL, normalização, link WhatsApp
  test/
    setup.ts                    # setup do Vitest
    integracao.ts               # guarda das suítes de integração: avisa local, FALHA no CI
public/
  manifest.json, sw.js, icons   # PWA
```

Testes ficam ao lado do código: `*.test.ts` / `*.test.tsx`.
Os que exigem banco no ar são `*.integration.test.ts` e o CI os roda num job próprio.

**Regra de ouro:** toda mutação de estado de domínio vive em `AppContext.tsx`.
Componentes nunca escrevem estado direto — chamam as ações do contexto.

**Segunda regra:** regra de negócio pura vai para `src/domain/`, não para dentro do componente.
Foi assim que a detecção de conflito deixou de estar duplicada entre o contexto e o `ScheduleModal`.
Cada módulo de `domain/` é a especificação executável de uma política que o Postgres também
aplica — os dois lados precisam dizer a mesma coisa.

**Terceira regra:** autorização é do banco. Nenhuma consulta de `src/data` filtra por usuário;
o que chega já é o que a RLS permitiu. Se você se pegar escrevendo um filtro de propriedade no
cliente, ou a política está errada ou o filtro é redundante — em nenhum dos casos o lugar é ali.

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

No banco, o agendamento existe **uma vez só**, na tabela `appointments`; `ticket.appointment` é
montado por `mappers.ts` na leitura. No protótipo havia duas cópias que precisavam ser atualizadas
juntas e divergiam — "Confirmar Presença" sumia da lista e continuava no detalhe do chamado.

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

### Regras de transição (RPCs em `supabase/migrations/…_rpc.sql`)

Cada ação é uma função transacional no banco: registro, evento de timeline e notificações
numa operação só. `AppContext` apenas as chama. As regras abaixo valem **no servidor**.

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

A máquina de estados é validada por **trigger** (`enforce_ticket_status_transition`), contra a
tabela `ticket_status_transitions`. Transição fora de ordem é recusada com erro, venha da
interface ou de um `curl`. No protótipo, as ações só ficavam escondidas na tela e
`updateTicketStatus` aceitava qualquer destino.

---

## 6. Isolamento de dados (multi-tenant) — regra crítica

Aplicado por **RLS no Postgres** — 38 políticas em `…_rls.sql`, com a visibilidade do chamado
concentrada em `can_read_ticket()` para que as tabelas filhas (timeline, chat, orçamento, anexos)
herdem a regra em vez de cada uma repeti-la e arriscar divergir. Vale para o DevTools, para o
`curl`, para o WebSocket do Realtime e para o Storage:

| Papel         | Enxerga                                                          | NÃO pode enxergar                                                              |
| ------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `inquilino`   | Somente chamados/agendamentos **do seu imóvel**                  | Outros imóveis, carteira da imobiliária, dashboard e faturamento da prestadora |
| `imobiliaria` | Somente chamados dos imóveis **sob sua gestão** (`agencyId`)     | Imóveis de outras imobiliárias, faturamento interno e margens da prestadora    |
| `empresa`     | **Tudo**: todos os chamados, agenda global, equipes, faturamento | —                                                                              |
| `prestador`   | Chamados/agendamentos **atribuídos a ele**                       | Faturamento, carteira comercial                                                |

O casamento é por **chave estrangeira** (`property_tenants`, `agency_members`,
`technicians.profile_id`). No protótipo era comparação de endereço com `includes()` bidirecional
— "Apto 402" casava com "Apto 201" e expunha o chamado do vizinho de andar — e o filtro do
técnico tinha um fallback literal `includes('carlos')`.

A regra tem **27 asserções de regressão** em `supabase/tests/01_isolamento.test.sql`, incluindo
o caso do vizinho de andar. Ao mexer em política, rode `npm run db:test`.

Observação de UI: `ProtectedRoute` decide o portal pelo papel da conta. Isso é _gating_ visual;
a segurança é a RLS. Os dois precisam concordar, mas só um dos dois protege.

---

## 7. Regras de agendamento

- No banco, um agendamento é uma janela `starts_at`/`ends_at` em `timestamptz`. O tipo do front
  continua expondo `date` + `startTime`/`endTime`, convertidos em `src/data/datetime.ts`.
- **Conflito é impossível, não improvável.** A regra é uma constraint do Postgres:

  ```sql
  exclude using gist (technician_id with =, tstzrange(starts_at, ends_at) with &&)
    where (status not in ('cancelado', 'nao_realizado'))
  ```

  Dois operadores agendando o mesmo técnico no mesmo instante: um dos dois recebe erro.
  Encostar não é sobrepor — `tstzrange` é `[início, fim)`, então 09–11 e 11–13 convivem.

- `src/domain/scheduling.ts` repete a regra no cliente **para avisar antes**, não para garantir.
  Se os dois divergirem, quem está certo é o banco.
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

**Protocolo do chamado.** Vem da sequência `ticket_protocol_seq` do Postgres, que começa em
1030 — `'#' || nextval(...)`, como default da coluna. No protótipo era `1030 + tickets.length`
e repetia assim que dois chamados nasciam ao mesmo tempo, ou depois de um reset de dados.

**Garantia.** `ServiceCompletion.warrantyMonths` — padrão sugerido de **3 meses** no formulário.
É registrado e exibido, mas o sistema **não** faz nada automático ao vencer.

**Avaliação.** Nota de **1 a 5** estrelas + três booleanos (`solved`, `satisfactory`, `punctual`)

- comentário livre. Só faz sentido após `concluido`. Alimenta o CSAT exibido à imobiliária.

**Notificações.** Uma linha **por destinatário** (`notifications.recipient_profile_id`), criada
pelo fan-out de `notify_ticket()`, que expande papéis para as pessoas que enxergam o chamado.
"Lido" é estado pessoal — nem a central lê a caixa dos outros. O protótipo tinha `targetRoles[]`
num registro só, com um `read` global, o que não sobrevive a vários usuários.

**Ao vivo.** `src/data/realtime.ts` assina `tickets`, `ticket_timeline`, `ticket_messages`,
`appointments` e `notifications`. **O evento é sinal, não dado:** ao receber, o cliente relê pelo
caminho normal (PostgREST, com RLS) em vez de aplicar o payload. Custa uma consulta a mais e
compra duas coisas — se a avaliação de RLS do Realtime falhar, o pior caso é uma releitura vazia
em vez de linha alheia na tela; e a montagem do chamado a partir de oito tabelas continua num
lugar só (`mappers.ts`). `DELETE` não é assinado: o Realtime não consegue aplicar RLS sobre uma
linha que já não existe.

**Datas.** Tudo é `timestamptz` no banco. Formatar é responsabilidade exclusiva da apresentação
(`src/data/datetime.ts`). O protótipo gravava string pt-BR (`"14/09/2025 às 13:26"`), o que
impedia ordenar e calcular.

**Fotos.** `MaintenanceTicket.photos` e similares guardam **caminhos** no bucket privado, não
URLs. Não existe link permanente: a URL assinada (1 h) é pedida na exibição. O protótipo guardava
base64 no `localStorage` e estourava a cota de ~5 MB do navegador em poucas fotos.

**Métricas da imobiliária.** Os números da aba "Métricas & Indicadores" (`AgencyView`)
— 1.8 dias, 92.4%, 4.9★, -80%, distribuição por categoria — são **hardcoded**, não calculados.

---

## 10. Estado atual vs. Produção

> **O protótipo virou aplicação.** O `localStorage` saiu, o Postgres entrou, e o isolamento
> entre inquilinos, imobiliárias e prestadora deixou de ser filtro de tela para ser política
> do banco. O estado detalhado e as tarefas pendentes ficam em
> [`docs/ESTADO-DO-PROJETO.md`](docs/ESTADO-DO-PROJETO.md).

### O que já é real e funciona

| Área             | Situação hoje                                                                                                  |
| ---------------- | -------------------------------------------------------------------------------------------------------------- |
| **Autenticação** | Supabase Auth: e-mail + senha, sessão persistida, recuperação e troca. Sem auto-cadastro, por decisão          |
| **Autorização**  | RLS no Postgres — 38 políticas. Vale para o DevTools, para o `curl` e para o WebSocket                         |
| **Persistência** | Postgres. Timeline e chat são compartilhados de verdade, não mais por navegador                                |
| **Arquivos**     | Bucket **privado**, redução no cliente (1600 px / JPEG 0.8), URL assinada de 1 h. O EXIF é descartado          |
| **Notificações** | Uma linha por destinatário, com "lido" pessoal. In-app e ao vivo. Sem e-mail, push ou WhatsApp                 |
| **Ao vivo**      | Realtime em `tickets`, timeline, chat, agenda e notificações. O evento é sinal; quem traz o dado é a releitura |
| **Cadastros**    | Painel administrativo cria imobiliárias, imóveis, inquilinos e técnicos com `service_role` no servidor         |
| **Deploy**       | `vercel.json` pronto (rewrite de SPA, CSP, HSTS). **Ainda não publicado** — ver `ESTADO-DO-PROJETO.md` §4.1    |

Mais os fluxos de UI dos 4 portais, a máquina de estados, o conflito de agenda garantido por
constraint do banco, o PWA instalável e os deep links de WhatsApp e Google Maps.

### O que continua sendo simulação

- **Métricas da imobiliária** — os números da aba "Métricas & Indicadores" são fixos no código.
  Está em [`docs/LACUNAS-FUNCIONAIS.md`](docs/LACUNAS-FUNCIONAIS.md): é decisão, não esquecimento.
  Não os apresente como reais.
- **`seed.sql`** — usuários e chamados de demonstração, aplicados só no banco local.
  O banco de produção nasce vazio; o primeiro administrador é criado à mão
  (ver [`docs/PRIMEIRO-ADMIN.md`](docs/PRIMEIRO-ADMIN.md)).

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
    uma vez. Um chamado de 9 eventos tinha 5 IDs distintos. Hoje o id vem do Postgres.
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

Fora o **Supabase** (banco, autenticação, arquivos e realtime) e a **Vercel** (hospedagem e a
function do painel administrativo), só restam deep links — nenhuma API de terceiro, chave ou
OAuth. É deliberado: o Google Calendar e o login com Google saíram do escopo em 2026-09-21 e
estão no backlog (`docs/PLANO-MIGRACAO.md` §10).

A `Content-Security-Policy` do `vercel.json` é restritiva e precisa continuar assim. Ela já libera
`https://*.supabase.co` e `wss://*.supabase.co` em `connect-src` — o `wss` é o realtime. Integração
nova exige liberar **o domínio dela**, nunca um `*`.

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
- IDs são **`uuid` gerados pelo Postgres** (`gen_random_uuid()` como default da coluna). O cliente
  nunca inventa id de entidade. O caminho de foto no Storage usa `crypto.randomUUID()`, que é o
  mesmo princípio. Nada de `Date.now()`: no protótipo ele colidia sempre que duas entidades
  nasciam no mesmo milissegundo — e uma única ação cria registro, timeline e notificação de uma vez.
- Feedback de ação é **UI**, nunca `alert()`/`confirm()` — o ESLint recusa (`no-alert`).
- Formulário **não** inventa dado: campo sem valor nasce vazio. Um default plausível vira registro
  permanente na timeline ou um orçamento que ninguém orçou (ver §11).
- `any` é erro de lint. Se o tipo é difícil, o problema costuma ser a modelagem.
- Ao adicionar um `TicketStatus` ou `AppointmentStatus`, atualize **obrigatoriamente**, nesta ordem:
  o `enum` do Postgres (nova migration) → `ticket_status_transitions`, senão a transição é recusada
  → `ticket_status_label()` → `npm run db:types` → `types.ts` → `utils/helpers.ts` (label/cor/step)
  → filtros de `<select>` em `AgencyView`/`CompanyView` → `TimelineViewer`.
  `src/lib/schemaContract.test.ts` falha se os tipos do banco e os de `types.ts` divergirem — é de
  propósito, e é o teste que impede o front e o banco de contarem histórias diferentes.

---

## 14. Ao evoluir este projeto

- **Não** introduza dependência de Google AI Studio, Gemini ou Firebase. O objetivo declarado da
  refatoração é desacoplar o app de qualquer stack proprietária.
- **A especificação do domínio agora é o banco.** Cada ação de `AppContext` corresponde a uma RPC
  em `…_rpc.sql`, com validação e autorização do lado de lá. Regra nova de negócio nasce lá, não
  no componente — senão ela vale para quem usa a tela e não vale para quem usa a API.
- Preserve o isolamento por papel da §6 — é requisito de negócio, não detalhe de implementação.
  Ele tem teste (`supabase/tests/01_isolamento.test.sql`); mexeu em política, rode.
- Preserve a timeline append-only — é o diferencial do produto. Ela é garantida pela **ausência**
  de políticas de `UPDATE` e `DELETE` em `ticket_timeline`. Adicionar uma "por conveniência" é
  desfazer a garantia.
- Segredo nenhum vai para o cliente. `VITE_*` é embutido no bundle e visível; a `service_role`
  ignora a RLS por completo e vive só nas variáveis de ambiente do servidor.
