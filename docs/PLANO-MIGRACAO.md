# Plano de Migração — Casa Pronta para Produção

**Objetivo:** transformar o protótipo do Google AI Studio num sistema multiusuário real,
rodando em **Vercel + Supabase**, sem amarra a nenhuma stack proprietária, mantendo
integralmente a regra de negócio documentada em [`CLAUDE.md`](../CLAUDE.md).

**Status:** escopo aprovado em 2026-09-21. **Etapas 1 e 2 concluídas.**
**Plano reordenado em 2026-09-28** para entregar uma versão utilizável em produção mais cedo e
incrementar a partir dela — ver §5.

Projeto Google do AI Studio apagado. Conta e projeto Supabase criados.

---

## 0. Premissas aprovadas

| Decisão                              | Definição                                                                                                                                                                                                                                                                                            |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tenancy**                          | **Uma prestadora** (Casa Pronta). N imobiliárias, N imóveis, N inquilinos, N técnicos. Não há `company_id` no schema.                                                                                                                                                                                |
| **Acesso**                           | Sem auto-cadastro. Um **painel administrativo** da prestadora cria imobiliárias, imóveis, inquilinos e técnicos. O admin comunica a credencial pelo canal que preferir (WhatsApp). Convite por e-mail fica disponível como opção de um clique.                                                       |
| **PWA**                              | Mantido e corrigido.                                                                                                                                                                                                                                                                                 |
| **Serviços Google com autenticação** | **Fora do escopo.** Google Calendar (OAuth) e login com Google saem do código nesta fase e vão para o backlog (§10).                                                                                                                                                                                 |
| **Deep links sem credencial**        | **Mantidos.** WhatsApp (`wa.me/...`) e Google Maps (`maps/search?api=1&query=...`) são URLs simples — sem API, sem chave, sem custo. São o que torna o app de campo do técnico útil.                                                                                                                 |
| **Histórico de orçamentos**          | **Aprovado.** A tabela `quotes` guarda todas as versões; a interface mostra a vigente. Hoje "Editar Orçamento" sobrescreve o anterior — inclusive um reprovado, apagando o motivo da reprovação.                                                                                                     |
| **Play Store / TWA**                 | Fora do escopo. Backlog.                                                                                                                                                                                                                                                                             |
| **Dados de demo**                    | Removidos do app. Viram um _seed_ SQL usado apenas em ambiente de staging.                                                                                                                                                                                                                           |
| **Lacunas funcionais**               | Documentadas em [`LACUNAS-FUNCIONAIS.md`](./LACUNAS-FUNCIONAIS.md), **sem trabalho previsto**. O produto é apresentado no escopo funcional atual; novos casos de uso saem do uso real.                                                                                                               |
| **Conflito de agenda**               | **Proibição rígida.** Um técnico nunca pode ter duas janelas sobrepostas — sem exceção autorizada. Vira constraint `EXCLUDE` no Postgres (§3). Encostar não é sobrepor: 09–11 e 11–13 convivem.                                                                                                      |
| **Ambientes**                        | **Um projeto Supabase** por enquanto, usado como desenvolvimento/homologação com o seed de demonstração. O projeto de produção, limpo, nasce na Etapa 8.                                                                                                                                             |
| **Região**                           | **`sa-east-1` (São Paulo).** ~50 ms a menos por consulta que `us-east-2`, e dado pessoal brasileiro (endereço residencial, fotos do interior do imóvel) permanece em solo brasileiro — evita a discussão de transferência internacional sob a LGPD. Região não se altera depois de criado o projeto. |
| **Entrega**                          | **Incremental.** Um primeiro release completo e seguro vai ao ar, e os incrementos seguem a partir dele. Nada é publicado antes da autenticação real existir.                                                                                                                                        |

---

## 1. Limpeza das credenciais herdadas

As credenciais do projeto Google descartável do AI Studio (`gen-lang-client-0528821397`) **já foram
removidas do código**: `firebase-applet-config.json` apagado e o OAuth Client ID de
`src/services/googleCalendar.ts` trocado por variável de ambiente.

Falta apagar o projeto no Google Cloud — depende da conta Google do cliente.
Passo a passo, avaliação de risco e quando um projeto novo será necessário:
**[`GUIA-GOOGLE-CLOUD.md`](./GUIA-GOOGLE-CLOUD.md)**.

Como ainda **não existe repositório git aqui**, nenhuma chave entrou em histórico de versionamento —
não há o que expurgar. É a razão de o `git init` ficar para o fim da Etapa 1.

---

## 2. Arquitetura alvo

```
┌──────────────────────────────────────────┐
│  Navegador — SPA React 19 + Vite         │
│  supabase-js  +  TanStack Query          │
└───────────────┬──────────────────────────┘
                │ anon key · JWT do usuário
                ▼
┌──────────────────────────────────────────┐        ┌─────────────────────────────┐
│  Supabase                                │        │  Vercel Serverless          │
│  ├── Auth (e-mail + senha)               │◄───────┤  /api/admin/*               │
│  ├── Postgres + RLS  ← a autorização     │  service│  único lugar com a          │
│  ├── RPC (funções de caso de uso)        │  role   │  service_role key           │
│  ├── Storage (fotos, bucket privado)     │        └─────────────────────────────┘
│  └── Realtime (timeline, chat, notifs)   │
└──────────────────────────────────────────┘
```

**Por que quase nada de servidor:** a autorização vira **RLS no Postgres** e as operações de vários
passos viram **funções RPC**. O `service_role` só é necessário para criar usuários no Auth — por isso
existe exatamente um endpoint serverless. Menos superfície, menos coisa para manter, e a regra de
negócio fica onde não pode ser contornada pelo DevTools.

**Stack adicionada:** `@supabase/supabase-js`, `@tanstack/react-query`, `react-router-dom`,
`zod` (validação de formulário compartilhada entre cliente e RPC).
**Stack removida:** `@google/genai`, `express`, `dotenv`, `motion` (nenhuma é importada hoje).

---

## 3. Modelo de dados

Enums Postgres espelham 1:1 os _union types_ de `src/types.ts`
(`user_role`, `ticket_status`, `priority_level`, `category`, `property_type`, `appointment_status`,
`quote_status`, `preferred_period`).

### Tabelas

```sql
profiles            id uuid PK → auth.users(id), name, email, phone, role user_role, active bool
agencies            id, name, cnpj unique, phone, email
properties          id, agency_id → agencies, code unique, address, unit, neighborhood,
                    city, state, zip, property_type
property_tenants    property_id → properties, profile_id → profiles, active, started_at, ended_at
technicians         id, profile_id → profiles (nullable), name, team, specialties text[],
                    phone, email, avatar_url, status, rating numeric(2,1)

tickets             id, protocol text default '#'||nextval('ticket_protocol_seq'),
                    property_id, agency_id, tenant_profile_id, created_by,
                    environment, category, description, urgency, preferred_period,
                    status ticket_status, assigned_technician_id,
                    created_at timestamptz, updated_at, last_action_at

ticket_timeline     id, ticket_id, status, title, description,
                    author_profile_id, author_role, created_at      ← append-only
ticket_messages     id, ticket_id, sender_profile_id, sender_role, body, created_at
attachments         id, ticket_id, kind, storage_path, uploaded_by, created_at
                    kind ∈ chamado | parecer | orcamento | antes | depois

technical_reports   id, ticket_id unique, technician_id, tenant_problem, situation_found,
                    possible_cause, recommended_solution, required_materials,
                    needs_quote, needs_return, recommended_priority, created_at
quotes              id, ticket_id, version int, service_description, materials_summary,
                    labor_summary, materials_cost numeric(12,2), labor_cost numeric(12,2),
                    total_cost numeric GENERATED ALWAYS AS (materials_cost + labor_cost) STORED,
                    execution_deadline_days, notes, status quote_status,
                    rejection_reason, approved_at, rejected_at, created_by, created_at
appointments        id, ticket_id (nullable), technician_id,
                    starts_at timestamptz, ends_at timestamptz,   ← substitui date+HH:MM em texto
                    status appointment_status, notes,
                    tenant_confirmed, tenant_confirmed_at, created_by, created_at
service_completions id, ticket_id unique, services_performed, materials_used,
                    warranty_months int, observations,
                    tenant_confirmed, tenant_confirmed_at, created_by, completed_at
evaluations         id, ticket_id unique, rating int CHECK (1..5),
                    solved, satisfactory, punctual, comments, created_by, created_at
notifications       id, recipient_profile_id, ticket_id, title, body,
                    type, read_at, created_at                      ← por usuário, não por papel
```

### Três mudanças estruturais em relação ao protótipo

1. **`appointments` usa `timestamptz`, não string.** Além de permitir ordenação e cálculo de SLA,
   habilita a trava de conflito no próprio banco:

   ```sql
   CREATE EXTENSION IF NOT EXISTS btree_gist;
   ALTER TABLE appointments ADD CONSTRAINT no_overlap_per_technician
     EXCLUDE USING gist (
       technician_id WITH =,
       tstzrange(starts_at, ends_at) WITH &&
     ) WHERE (status NOT IN ('cancelado', 'nao_realizado'));
   ```

   A regra de conflito de agenda (hoje um `.find()` em JavaScript, contornável e sujeito a corrida)
   passa a ser **impossível de violar**, inclusive com dois operadores agendando ao mesmo tempo.

2. **`notifications` é por destinatário, não por papel.** Hoje uma notificação tem
   `targetRoles: ['imobiliaria','empresa']` e um único campo `read` global. Com vários usuários reais
   isso não funciona: o "lido" é de cada pessoa. O fan-out passa a ser feito por trigger, que expande
   o papel para os `profiles` que efetivamente enxergam aquele chamado.

3. **Todas as datas viram `timestamptz`.** A formatação pt-BR (`"14/09/2025 às 13:26"`) vira
   responsabilidade exclusiva da camada de apresentação.

### Isolamento (RLS) — a tradução da §6 do CLAUDE.md

Funções auxiliares `STABLE SECURITY DEFINER`: `auth_role()`, `auth_agency_id()`,
`auth_technician_id()`, `auth_property_ids()`.

```sql
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY tickets_select ON tickets FOR SELECT USING (
     auth_role() = 'empresa'
  OR (auth_role() = 'imobiliaria' AND agency_id = auth_agency_id())
  OR (auth_role() = 'inquilino'   AND property_id = ANY (auth_property_ids()))
  OR (auth_role() = 'prestador'   AND assigned_technician_id = auth_technician_id())
);
```

As demais tabelas herdam a visibilidade por `ticket_id`, via `EXISTS (SELECT 1 FROM tickets ...)`.
`ticket_timeline` recebe políticas de `INSERT` e `SELECT` apenas — **sem `UPDATE` nem `DELETE`**,
tornando o histórico append-only uma garantia do banco.

A separação comercial também é estrutural: as tabelas `quotes.materials_cost` / `labor_cost` são
visíveis à imobiliária (ela aprova), mas qualquer visão agregada de faturamento fica em uma _view_
restrita a `empresa`.

### Máquina de estados no banco

Trigger `BEFORE UPDATE ON tickets` valida a transição contra uma tabela
`(from_status, to_status, allowed_role)` derivada da §5 do `CLAUDE.md`. Transição não prevista →
`RAISE EXCEPTION`. Isso fecha o buraco atual, em que `updateTicketStatus` aceita qualquer destino.

### Casos de uso como RPC

Cada ação do `AppContext` vira uma função Postgres transacional, porque todas escrevem em mais de
uma tabela (registro + timeline + notificações):

`create_ticket`, `update_ticket_status`, `assign_technician`, `post_message`,
`save_technical_report`, `submit_quote`, `review_quote`, `schedule_appointment`,
`update_appointment_status`, `finalize_service`, `confirm_tenant_completion`, `submit_evaluation`.

`AppContext.tsx` é a especificação executável dessas funções — a lógica é portada, não reinventada.

---

## 4. Frontend

**O que muda pouco:** os componentes de view e os modais. Eles consomem `useApp()` e continuam
consumindo. Mantenho o `AppContext` como **fachada**, agora implementada sobre TanStack Query +
supabase-js, para que a migração não vire uma reescrita de 10 mil linhas de JSX.

**O que muda:**

- `mockData.ts` / `mockUsers.ts` saem do bundle; viram `supabase/seed.sql` (só staging).
- Todos os `localStorage.setItem` de domínio saem (restam preferências de UI).
- Entra `react-router-dom`: hoje a "navegação" é estado em `localStorage` e a URL nunca muda —
  não dá para compartilhar link de chamado nem usar o botão voltar.
  Rotas: `/login`, `/inquilino`, `/imobiliaria`, `/empresa`, `/prestador`, `/chamados/:protocolo`, `/admin`.
- Entra `<ProtectedRoute>` por papel, com o portal derivado do papel do usuário autenticado —
  não mais de uma aba escolhida à mão (o seletor de portal do `Header` era ferramenta de demo).
- Estados de `loading` / `error` / vazio, que hoje não existem porque tudo era síncrono.
- Realtime: `tickets`, `ticket_timeline`, `ticket_messages` e `notifications` por subscription.
  É o que finalmente faz o chat e a timeline serem compartilhados.
- Upload de fotos: redução para 1600 px / JPEG 0.8 no cliente antes de subir ao Storage; a UI
  passa a trabalhar com URL assinada em vez de base64.
- `alert()` / `confirm()` substituídos por toasts e diálogos de confirmação.

---

## 5. Etapas de execução

Cada etapa é um PR fechado, revisável e que deixa o sistema funcionando.

### ✅ Etapa 1 — Higienização e correção de defeitos — CONCLUÍDA em 2026-09-21

_Não depende de Supabase. Deixa o projeto saudável antes de mexer em arquitetura._

- Remover `metadata.json`, o `README.md` do AI Studio e o `DISABLE_HMR` do `vite.config.ts`;
  reescrever `.env.example`. (`firebase-applet-config.json` já foi apagado — ver §1.)
- Remover `@google/genai`, `express`, `dotenv`, `motion`; renomear o pacote para `casa-pronta`.
- Fixar `@types/react` / `@types/react-dom` (já adicionados na análise) e ativar `strict` no tsconfig.
- Corrigir os **14 defeitos** da §11 do `CLAUDE.md` — com destaque para o status inválido
  `'em_andamento'`, os filtros hardcoded em `'Carlos'`, o `NewTicketModal` pré-preenchido com os dados
  da Mariana e o `getAuthorName()` que ignora quem está logado.
- Remover `services/googleCalendar.ts`, `GoogleCalendarSyncButton`, `PlayStoreGuideModal`,
  `assetlinks.json` e o `<script>` do Google Identity Services no `index.html` (backlog §10).
  **Preservar** os deep links de WhatsApp (`utils/helpers.generateWhatsAppLink`) e de Google Maps
  na rota do técnico — são URLs sem credencial e continuam no escopo.
- Remover o e-mail pessoal hardcoded em `LoginPortal.tsx:84`.
- ESLint 9 (flat) + typescript-eslint + Prettier; `npm run lint` passa a ser lint de verdade e
  `npm run typecheck` o `tsc`.
- Vitest + Testing Library: cobrir `utils/helpers`, a máquina de estados e a detecção de conflito.
- GitHub Actions: `typecheck` + `lint` + `test` + `build` em cada PR.
- `git init`, `.gitignore` revisado, commit inicial.

### ✅ Etapa 2 — Fundação Supabase — CONCLUÍDA em 2026-09-23

Detalhes de operação em [`supabase/README.md`](../supabase/README.md).

- `supabase init`; migrations versionadas em `supabase/migrations/`.
- Enums, tabelas, índices, a constraint `EXCLUDE` de agenda e a sequência de protocolo.
- Funções auxiliares de auth, políticas RLS de todas as tabelas, trigger da máquina de estados.
- Buckets de Storage e suas políticas.
- `seed.sql` com os dados de demonstração (staging).
- **Testes de RLS** com pgTAP: um teste por afirmação da §6 do `CLAUDE.md` — por exemplo,
  "inquilino da Rua das Acácias não enxerga chamado da Av. Paulista". Esta suíte é a prova de que o
  isolamento de dados funciona, e roda no CI.

### Reordenação de 2026-09-28 — produção cedo, incrementos depois

O plano original deixava o deploy para o fim. Dois motivos para mudar:

1. **Sem o painel administrativo, a produção nasce inutilizável.** Não há auto-cadastro
   (premissa §0): um banco de produção novo tem zero usuários e nenhuma forma de criar
   o primeiro. A Etapa 7 não é refinamento — é o que destranca o sistema. Ela sobe.
2. **Infraestrutura de deploy é trilho, não etapa final.** Configurada cedo, toda etapa
   seguinte nasce publicável.

**Nada vai ao ar antes da autenticação real existir.** O Marco 0 configura a Vercel mas
não publica nada acessível — a primeira URL no ar já vem com login de verdade.

#### Marco 0 — Trilho de produção · ~meio dia

- `supabase link` + `db push` no projeto `sa-east-1`.
- Projeto na Vercel, variáveis de ambiente, `vercel.json` (rewrite de SPA, headers de segurança).
- Preview por branch **sem deploy de produção**. Sem URL pública enquanto o login for falso.

#### Marco 1 — Primeiro release utilizável · ~8–10 dias

Nesta ordem, cada item publicando em homologação ao concluir:

| #   | Etapa                                               | Por que está aqui                                                                                 |
| --- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1   | **Autenticação** (antiga Etapa 3)                   | Nada é publicável sem isto                                                                        |
| 2   | **Painel administrativo** (antiga Etapa 7)          | Cria imobiliárias, imóveis, inquilinos e técnicos. Sem ele não há primeiro usuário                |
| 3   | **Camada de dados** (antiga Etapa 4)                | Substitui o `localStorage`; o ciclo do chamado precisa fechar de ponta a ponta                    |
| 4   | **Fotos no Storage** (antiga Etapa 5)               | Foto do vazamento e antes/depois são feature base — cortar seria regredir em relação ao protótipo |
| 5   | **Notificações** (antiga Etapa 6)                   | Barato: tabela, trigger e RPC já existem desde a Etapa 2; falta só a leitura na interface         |
| 6   | **PWA, domínio e observabilidade** (antiga Etapa 8) | Service worker corrigido, Sentry, e o apontamento do domínio                                      |

Escopo mínimo coerente: o ciclo precisa fechar (abrir → analisar → orçar → aprovar →
agendar → executar → concluir → avaliar). Remover qualquer fatia da camada de dados
deixa chamados que nunca terminam.

#### Marco 2+ — Incrementos, já com gente usando

Backlog (§10) e [`LACUNAS-FUNCIONAIS.md`](./LACUNAS-FUNCIONAIS.md): métricas reais no lugar
dos números fixos, PDF de orçamento e laudo, notificação por e-mail e WhatsApp, SLA,
alçada de aprovação, controle de garantia.

---

### Detalhamento das etapas

#### Autenticação

- Cliente Supabase, `AuthProvider`, sessão persistida, refresh de token.
- `/login` com e-mail + senha; "esqueci minha senha"; troca de senha no primeiro acesso.
- Rotas protegidas por papel; portal derivado do papel, não de uma aba escolhida à mão.
- Remoção de `PRESET_USERS`, das senhas universais `123`/`admin`, do login por nome parcial
  e do auto-cadastro.

#### Painel administrativo

CRUD de **imobiliárias**, **imóveis**, **inquilinos** (com vínculo ao imóvel) e **técnicos**.
Criação de usuário via `/api/admin/users` (Vercel Function + `service_role`), com duas saídas:
senha temporária exibida para copiar, ou convite por e-mail. Desativação de usuário e troca de
vínculo de inquilino quando o imóvel muda de locatário.

#### Camada de dados

Substituição do `localStorage` pelo Supabase, em fatias entregáveis:
**a** chamados (listagem, detalhe, abertura) · **b** timeline + chat + realtime ·
**c** parecer técnico e orçamento · **d** agenda e conflito ·
**e** conclusão, aceite do inquilino e avaliação.

#### Fotos no Storage

Upload com redução no cliente (1600 px / JPEG 0.8), URL assinada, galerias de antes/depois,
limite de tamanho e quantidade.

#### Notificações

Badge com contagem real por usuário, marcar como lida, realtime. O fan-out por trigger
já existe desde a Etapa 2.

#### PWA, deploy e observabilidade

- Service worker: _network-first_ para navegação, _cache-first_ só para assets com hash.
- `vercel.json`: rewrite de SPA, headers de segurança (CSP, HSTS, `X-Frame-Options`).
- Projeto Supabase de produção, separado do de homologação.
- Sentry para erros de frontend; runbook de deploy no `README.md`.

---

## 6. Ambientes e variáveis

| Variável                    | Onde                          | Pública?                |
| --------------------------- | ----------------------------- | ----------------------- |
| `VITE_SUPABASE_URL`         | Vercel (build)                | sim                     |
| `VITE_SUPABASE_ANON_KEY`    | Vercel (build)                | sim — protegida por RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel (runtime, só `/api/*`) | **NÃO**                 |
| `SENTRY_DSN`                | Vercel                        | sim                     |

**Hoje:** um único projeto Supabase, com o seed de demonstração, servindo como
desenvolvimento/homologação. O projeto de produção — limpo, sem seed — nasce na Etapa 8.
Migrations versionadas em `supabase/migrations/` e aplicadas via Supabase CLI.

**O que vou precisar de você:** uma conta Supabase (o plano gratuito atende para começar; o Pro,
US$ 25/mês, é o que dá backup diário — recomendo antes de entrar em produção real), uma conta
Vercel, um domínio, e as credenciais do primeiro usuário admin da Casa Pronta.

---

## 6b. Criando o projeto Supabase em São Paulo

O projeto `us-east-2` criado em 28/09 foi descartado antes de receber qualquer dado.
Roteiro do substituto:

1. <https://supabase.com/dashboard/new> — na mesma organização.
2. **Name:** `casa-pronta` · **Region:** `South America (São Paulo)` — `sa-east-1`.
3. **Database Password:** gere uma forte e guarde no seu gerenciador de senhas.
   Ela não é recuperável: se perder, só dá para redefinir em Settings → Database.
   **Não cole essa senha em conversa nenhuma** — ela é digitada direto no prompt do
   `supabase link`.
4. Copie o **project ref** da URL: `supabase.com/dashboard/project/‹ref›`.
5. Apague o projeto de Ohio em Settings → General → Delete project, para não ficarem dois
   com o mesmo nome.

Depois, no repositório:

```bash
npx supabase link --project-ref <novo-ref>   # pede a senha no prompt
npm run db:push                              # aplica as 9 migrations
```

`seed.sql` **não** vai junto: ele é só de desenvolvimento.

---

## 7. Esforço estimado

| Etapa                                  | Estimativa                 |
| -------------------------------------- | -------------------------- |
| 1 — Higienização e defeitos            | 1 dia                      |
| 2 — Schema, RLS e testes de isolamento | 2–3 dias                   |
| 3 — Autenticação                       | 1 dia                      |
| 4 — Camada de dados (5 fatias)         | 4–5 dias                   |
| 5 — Storage de fotos                   | 1 dia                      |
| 6 — Notificações                       | 1 dia                      |
| 7 — Painel administrativo              | 2–3 dias                   |
| 8 — PWA, deploy, observabilidade       | 1–2 dias                   |
| **Total**                              | **13–17 dias de trabalho** |

Estimativa de esforço técnico, não de calendário. As etapas 1–3 já entregam um app publicado,
com login real e sem amarra ao AI Studio — é o primeiro marco que vale a pena mostrar.

---

## 8. Riscos

| Risco                                                                             | Mitigação                                                                                                        |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| RLS mal escrita vaza dados entre imobiliárias — o pior cenário do produto         | Suíte pgTAP na Etapa 2, uma asserção por regra da §6, rodando no CI antes de qualquer deploy                     |
| A fachada `useApp()` virar gargalo (um Context re-renderizando tudo)              | TanStack Query por recurso; se o `Context` pesar, quebrar em hooks por domínio sem tocar nos componentes         |
| Regra de negócio não documentada existir só na cabeça de quem opera hoje          | O `CLAUDE.md` é o contrato — revise-o. Divergência encontrada agora custa minutos; depois da Etapa 4, custa dias |
| `EXCLUDE` de agenda rejeitar casos legítimos (ex.: dois serviços no mesmo prédio) | Confirmar com a operação se um técnico pode ter janelas sobrepostas; hoje o código diz que não                   |
| Fotos estourarem a cota do Storage                                                | Redução no cliente + limite por chamado + política de retenção                                                   |

---

## 9. O que o sistema **não** faz

Ausência de SLA, de acompanhamento de garantia, de alçada de aprovação, de proprietário do imóvel,
de faturamento real, de relatórios e de notificação fora do app — entre outras.

Tudo catalogado em **[`LACUNAS-FUNCIONAIS.md`](./LACUNAS-FUNCIONAIS.md)**.

**Decisão:** nenhuma dessas lacunas entra no escopo. O produto é apresentado no escopo funcional
atual e o uso real dirá quais delas são mesmo necessárias. A migração preserva o comportamento —
ela não adiciona regra de negócio nova, então as lacunas continuam valendo depois dela.

---

## 10. Backlog pós-migração

1. **Google Agenda** — sincronização de visitas. Exige projeto próprio no Google Cloud e OAuth
   Client ID. O código atual (`services/googleCalendar.ts`) fica preservado no histórico do git
   para ser retomado. Recomendo reimplementar via _service account_ no servidor, não com OAuth
   no navegador como está hoje.
2. **Login com Google** (Supabase Auth já suporta como provider — é configuração, não código).
3. **Publicação na Play Store (TWA)** — exige conta de desenvolvedor Google Play (US$ 25 único) e
   o fingerprint SHA-256 real do keystore no `assetlinks.json` (hoje é `00:00:…`).
4. **Notificações por e-mail e WhatsApp** — e-mail via Supabase/Resend; WhatsApp exige a Cloud API
   da Meta, com número verificado e templates aprovados. É o item de maior impacto percebido pelo
   inquilino, e o de maior custo de aprovação.
5. **Push notifications** (Web Push; o service worker já existe).
6. **SLA, alçada de aprovação e controle de garantia** (§9).
7. **Relatórios em PDF** de orçamento e laudo técnico.
8. **Métricas reais** substituindo os números fixos da imobiliária.
