# CLAUDE.md — Casa Pronta · Gestão de Manutenções

Documento de referência para qualquer agente ou dev que trabalhe neste repositório.
Contém **o domínio e as regras de negócio** — a parte que não pode se perder — e a
arquitetura do código.

**Documentos irmãos:**

- [`docs/ESTADO-DO-PROJETO.md`](docs/ESTADO-DO-PROJETO.md) — **comece por aqui.** O que está no ar, o que falta, o roteiro de ensaio e as decisões em vigor. É de lá que saem as tarefas.
- [`docs/LACUNAS-FUNCIONAIS.md`](docs/LACUNAS-FUNCIONAIS.md) — o que o sistema **não** faz, por decisão, e o backlog por ordem de impacto.
- [`docs/DEPLOY.md`](docs/DEPLOY.md) — operação: Vercel, variáveis, publicação de migration, cabeçalhos de segurança.
- [`docs/PRIMEIRO-ADMIN.md`](docs/PRIMEIRO-ADMIN.md) — como nasce a primeira conta num banco vazio, e como recuperar o acesso.
- [`supabase/README.md`](supabase/README.md) — schema, testes pgTAP e o banco local.

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
npm run db:types     # regenera src/lib/database.types.ts a partir do schema

npm run verificar:producao   # teste de fumaça contra o ambiente no ar
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
scripts/
  db.sh                         # ciclo de vida do Supabase local, por perfil
  verificar-producao.mjs        # teste de fumaça do ambiente no ar
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
    scheduling.ts               # conflito de agenda (§6) — espelha a constraint EXCLUDE
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
Cada módulo de `domain/` é a especificação executável de uma política que o Postgres também
aplica — os dois lados precisam dizer a mesma coisa, e quem está certo é o banco.

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
  ├── quote?: Quote                     (0..1 — a versão mais recente das várias do chamado)
  ├── appointment?: Appointment         (0..1)
  ├── completion?: ServiceCompletion    (0..1)
  └── evaluation?: Evaluation           (0..1)

Appointment ──> technicianId ──> Technician
```

O agendamento existe **uma vez só**, na tabela `appointments`; `ticket.appointment` é montado por
`mappers.ts` na leitura. O mesmo vale para o orçamento: o banco guarda todas as versões em
`quotes`, e o mapeador expõe a de maior `version`.

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
(declarado no tipo e com label, mas **nenhuma ação do sistema o define** — ver
`LACUNAS-FUNCIONAIS.md`).

### Regras de transição

Cada ação é uma função transacional em `…_rpc.sql`: grava o registro, o evento de timeline e as
notificações numa operação só. `AppContext` apenas as chama. As regras valem **no servidor**.

1. **Toda** mudança de status acrescenta um evento de timeline (append-only) e atualiza
   `updated_at` / `last_action_at`. A timeline nunca é editada nem removida.
2. **Toda** mudança relevante dispara notificação para quem enxerga o chamado.
3. O parecer técnico (`save_technical_report`) move o chamado para `aguardando_vistoria`
   **somente se** `needs_quote` for verdadeiro; caso contrário preserva o status atual.
   Ele também **sobrescreve a prioridade do chamado** com a recomendada pelo técnico.
4. `submit_quote` força o status para `orcamento_enviado` e cria a versão nova com `enviado`.
5. `review_quote` reprovando **exige motivo** — há `CHECK` na tabela, não só validação de tela.
6. `schedule_appointment` só cria se não houver conflito (§6); em caso de sucesso vincula o
   técnico ao chamado e move para `servico_agendado`.
7. `finalize_service` move para `concluido` e marca o agendamento correspondente como `concluido`.
8. `confirm_tenant_completion` **não** muda o status — só marca o aceite do inquilino e registra
   na timeline.
9. `submit_evaluation` também não muda status; anexa a avaliação e registra na timeline.

A ordem é imposta por **trigger** (`enforce_ticket_status_transition`) contra a tabela
`ticket_status_transitions`. Transição fora de ordem é recusada com erro, venha da interface ou
de um `curl`.

---

## 6. Isolamento de dados (multi-tenant) — regra crítica

Aplicado por **RLS no Postgres** — 38 políticas em `…_rls.sql`, com a visibilidade do chamado
concentrada em `can_read_ticket()` para que as tabelas filhas (timeline, chat, orçamento, anexos)
herdem a regra em vez de cada uma repeti-la e arriscar divergir. Vale para o DevTools, para o
`curl`, para o WebSocket do Realtime e para o Storage:

| Papel         | Enxerga                                                          | NÃO pode enxergar                                                              |
| ------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `inquilino`   | Somente chamados/agendamentos **do seu imóvel**                  | Outros imóveis, carteira da imobiliária, dashboard e faturamento da prestadora |
| `imobiliaria` | Somente chamados dos imóveis **sob sua gestão** (`agency_id`)    | Imóveis de outras imobiliárias, faturamento interno e margens da prestadora    |
| `empresa`     | **Tudo**: todos os chamados, agenda global, equipes, faturamento | —                                                                              |
| `prestador`   | Chamados/agendamentos **atribuídos a ele**                       | Faturamento, carteira comercial                                                |

O casamento é por **chave estrangeira** — `property_tenants`, `agency_members`,
`technicians.profile_id` —, nunca por comparação de nome ou endereço.

A regra tem **27 asserções de regressão** em `supabase/tests/01_isolamento.test.sql`. A mais
importante: o inquilino do Apto 402 não enxerga o chamado do Apto 201 no mesmo prédio. Mexeu em
política, rode `npm run db:test`.

Observação de UI: `ProtectedRoute` decide o portal pelo papel da conta. Isso é _gating_ visual;
a segurança é a RLS. Os dois precisam concordar, mas só um dos dois protege.

---

## 7. Regras de agendamento

- No banco, um agendamento é uma janela `starts_at`/`ends_at` em `timestamptz`. O tipo do front
  expõe `date` + `startTime`/`endTime`, convertidos em `src/data/datetime.ts`.
- **Conflito é impossível, não improvável.** A regra é uma constraint do Postgres:

  ```sql
  exclude using gist (technician_id with =, tstzrange(starts_at, ends_at) with &&)
    where (status not in ('cancelado', 'nao_realizado'))
  ```

  Dois operadores agendando o mesmo técnico no mesmo instante: um dos dois recebe erro.
  Encostar não é sobrepor — `tstzrange` é `[início, fim)`, então 09–11 e 11–13 convivem.

- `src/domain/scheduling.ts` repete a regra no cliente **para avisar antes**, não para garantir.
- `ScheduleModal` valida `startTime < endTime` e mostra aviso de conflito enquanto o operador
  escolhe técnico e horário.
- A grade da agenda da prestadora cobre **08:00–17:00** (`CompanyView`).
- O inquilino pode **confirmar presença**, o que marca `tenant_confirmed` e notifica empresa e
  técnico.

---

## 8. Regras financeiras (orçamento)

- `total_cost` = `materials_cost + labor_cost`, coluna gerada. Não há imposto, desconto nem taxa
  de administração.
- Campos obrigatórios de negócio: descrição do serviço, resumo de materiais, resumo de mão de
  obra, os dois custos e o prazo de execução em dias.
- Estados do orçamento: `enviado → aprovado | reprovado`. Reprovação exige motivo, garantido por
  `CHECK` na tabela.
- Um chamado pode ter **várias versões** de orçamento. O histórico é preservado: reprovar e
  reenviar cria uma versão nova, não sobrescreve a anterior nem apaga o motivo da recusa.
- **Quem aprova é a imobiliária** (a UI também libera para `empresa`, por conveniência
  operacional).
- O "Faturamento" do `CompanyView` é a soma de todos os orçamentos, aprovados ou não — é valor
  **orçado**, não receita. Ver `LACUNAS-FUNCIONAIS.md`.
- Formatação monetária sempre via `formatCurrency()` (`Intl.NumberFormat pt-BR / BRL`).

---

## 9. Outras regras

**Protocolo do chamado.** Vem da sequência `ticket_protocol_seq` do Postgres, que começa em 1030
— `'#' || nextval(...)` como default da coluna.

**Garantia.** `warranty_months` tem padrão sugerido de **3 meses** no formulário. É registrado e
exibido, e o sistema **não** faz nada automático ao vencer.

**Avaliação.** Nota de **1 a 5** estrelas, três booleanos (`solved`, `satisfactory`, `punctual`) e
comentário livre. Só faz sentido após `concluido`. Alimenta o CSAT exibido à imobiliária.

**Notificações.** Uma linha **por destinatário** (`notifications.recipient_profile_id`), criada
pelo fan-out de `notify_ticket()`, que expande papéis para as pessoas que enxergam o chamado.
"Lido" é estado pessoal — nem a central lê a caixa dos outros.

**Ao vivo.** `src/data/realtime.ts` assina `tickets`, `ticket_timeline`, `ticket_messages`,
`appointments` e `notifications`. **O evento é sinal, não dado:** ao receber, o cliente relê pelo
caminho normal (PostgREST, com RLS) em vez de aplicar o payload. Custa uma consulta a mais e
compra duas coisas — se a avaliação de RLS do Realtime falhar, o pior caso é uma releitura vazia
em vez de linha alheia na tela; e a montagem do chamado a partir de oito tabelas continua num
lugar só (`mappers.ts`). `DELETE` não é assinado: o Realtime não consegue aplicar RLS sobre uma
linha que já não existe.

**Datas.** Tudo é `timestamptz` no banco. Formatar é responsabilidade exclusiva da apresentação
(`src/data/datetime.ts`).

**Fotos.** `MaintenanceTicket.photos` e similares guardam **caminhos** no bucket privado, não
URLs. Não existe link permanente: a URL assinada (1 h) é pedida na exibição. O caminho segue
`tickets/<ticket_id>/<uuid>.jpg`, porque é dele que as políticas do Storage extraem o chamado
para decidir quem pode ler. A redução no cliente (1600 px / JPEG 0.8) descarta o EXIF junto — o
que é desejável, já que foto de celular carrega a geolocalização do endereço de alguém.

---

## 10. Estado do projeto

O que está no ar, o que falta e o que é risco aceito ficam em
[`docs/ESTADO-DO-PROJETO.md`](docs/ESTADO-DO-PROJETO.md), que é atualizado a cada entrega.

O que o sistema deliberadamente **não** faz — SLA, garantia ativa, alçada de aprovação,
proprietário do imóvel, faturamento real, relatórios, notificação fora do app — está em
[`docs/LACUNAS-FUNCIONAIS.md`](docs/LACUNAS-FUNCIONAIS.md). Não apresente nenhum desses como
existente.

---

## 11. Integrações externas

Fora o **Supabase** (banco, autenticação, arquivos e realtime) e a **Vercel** (hospedagem e a
function do painel administrativo), só restam deep links — nenhuma API de terceiro, chave ou
OAuth.

A `Content-Security-Policy` do `vercel.json` é restritiva e precisa continuar assim. Ela libera
`https://*.supabase.co` e `wss://*.supabase.co` em `connect-src` — o `wss` é o realtime.
Integração nova exige liberar **o domínio dela**, nunca um `*`.

**WhatsApp** — `generateWhatsAppLink()` monta `https://wa.me/55<digits>?text=…`. Usado no contato
do técnico com o inquilino e no compartilhamento de status pelo detalhe do chamado.

**Google Maps** — `google.com/maps/search/?api=1&query=<endereço>`, na rota do dia do técnico.

**PWA** — `manifest.json` (id `com.casapronta.manutencao`, standalone, portrait) e `sw.js`
(network-first para navegação, cache-first para `/assets/*`, que tem hash no nome).

> Não introduza dependência de Google AI Studio, Gemini ou Firebase. O objetivo declarado do
> projeto é não ter amarra com stack proprietária.

---

## 12. Convenções de código

- Componentes: `React.FC<Props>` com interface `Props` nomeada logo acima; export **nomeado**
  (exceto `App`, que é default).
- Arquivos em `PascalCase.tsx` para componentes, `camelCase.ts` para serviços/utils.
- Estilo: **Tailwind inline**, sem CSS modules nem styled-components. `src/index.css` só importa
  o Tailwind.
- Paleta por portal — mantenha a consistência: **inquilino = emerald**, **imobiliária = purple**,
  **empresa = indigo**, **prestador = cyan/slate**.
- Todo texto de interface em **português do Brasil**.
- Identificadores de domínio (status, papéis, categorias) em **português sem acento, snake_case**
  (`orcamento_aprovado`) — nomes de variáveis e funções em inglês.
- IDs são **`uuid` gerados pelo Postgres** (`gen_random_uuid()` como default da coluna). O cliente
  nunca inventa id de entidade; o caminho de foto no Storage usa `crypto.randomUUID()`.
- Feedback de ação é **UI**, nunca `alert()`/`confirm()` — o ESLint recusa (`no-alert`).
- Formulário **não** inventa dado: campo sem valor nasce vazio. Um default plausível vira parecer
  técnico que o técnico não escreveu, ou orçamento que ninguém orçou — e vai para a timeline, que
  é permanente.
- Mensagem de erro de autenticação é genérica de propósito (`E-mail ou senha inválidos.`):
  distinguir os casos revelaria quais e-mails existem.
- `any` é erro de lint. Se o tipo é difícil, o problema costuma ser a modelagem.
- Ao adicionar um `TicketStatus` ou `AppointmentStatus`, atualize **obrigatoriamente**, nesta
  ordem: o `enum` do Postgres (nova migration) → `ticket_status_transitions`, senão a transição é
  recusada → `ticket_status_label()` → `npm run db:types` → `types.ts` → `utils/helpers.ts`
  (label/cor/step) → filtros de `<select>` em `AgencyView`/`CompanyView` → `TimelineViewer`.
  `src/lib/schemaContract.test.ts` falha se os tipos do banco e os de `types.ts` divergirem — é de
  propósito, e é o teste que impede o front e o banco de contarem histórias diferentes.

---

## 13. Ao evoluir este projeto

- **A especificação do domínio é o banco.** Cada ação de `AppContext` corresponde a uma RPC em
  `…_rpc.sql`, com validação e autorização do lado de lá. Regra nova de negócio nasce lá, não no
  componente — senão ela vale para quem usa a tela e não vale para quem usa a API.
- Preserve o isolamento por papel da §6. É requisito de negócio, não detalhe de implementação, e
  tem teste: mexeu em política, rode `npm run db:test`.
- Preserve a timeline append-only. Ela é garantida pela **ausência** de políticas de `UPDATE` e
  `DELETE` em `ticket_timeline`; adicionar uma "por conveniência" desfaz a garantia.
- Segredo nenhum vai para o cliente. `VITE_*` é embutido no bundle e visível; a `service_role`
  ignora a RLS por completo e vive só nas variáveis de ambiente do servidor.
- Configuração de Auth (cadastro público, URLs de redirecionamento, SMTP) **não** está no
  repositório: o `config.toml` vale só para o ambiente local. Em produção é painel do Supabase, e
  `npm run verificar:producao` é o que confere.
