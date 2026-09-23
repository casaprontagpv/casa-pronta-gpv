-- ════════════════════════════════════════════════════════════════════════════
-- Tabelas do domínio
--
-- Modelo de tenancy: UMA prestadora (Casa Pronta). N imobiliárias, N imóveis,
-- N inquilinos, N técnicos. Por isso não existe `company_id` em lugar nenhum.
--
-- Todas as datas são `timestamptz`. O protótipo gravava string pt-BR
-- ("14/09/2025 às 13:26"), o que impedia ordenar e calcular.
-- Formatar é responsabilidade exclusiva da apresentação.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Pessoas ────────────────────────────────────────────────────────────────

-- Espelha auth.users. O id É o id do Supabase Auth — nunca um id próprio.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  email text not null,
  phone text,
  role public.user_role not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Dados de perfil por usuário do Auth. O papel aqui é a base de toda política RLS.';

create index profiles_role_idx on public.profiles (role);
create unique index profiles_email_key on public.profiles (lower(email));

-- ─── Carteira ───────────────────────────────────────────────────────────────

create table public.agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  cnpj text unique,
  phone text,
  email text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.agencies is 'Imobiliárias parceiras. Cada uma enxerga só a própria carteira.';

-- Vincula o usuário `imobiliaria` à sua imobiliária.
create table public.agency_members (
  agency_id uuid not null references public.agencies (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (agency_id, profile_id)
);

create index agency_members_profile_idx on public.agency_members (profile_id);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete restrict,
  code text not null unique,
  address text not null check (length(trim(address)) > 0),
  unit text,
  neighborhood text,
  city text not null default 'São Paulo',
  state text not null default 'SP',
  zip_code text,
  property_type public.property_type not null default 'apartamento',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.properties is
  'Imóvel sob gestão de uma imobiliária. Ter chave própria é o que impede o prontuário '
  'de se fragmentar quando o mesmo endereço é digitado de duas formas.';

create index properties_agency_idx on public.properties (agency_id);

-- Vínculo inquilino ↔ imóvel. É uma tabela, e não um campo em profiles, porque
-- o locatário muda ao longo do tempo e o histórico do imóvel precisa sobreviver a isso.
create table public.property_tenants (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  active boolean not null default true,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  check (ended_at is null or ended_at >= started_at)
);

create index property_tenants_profile_idx on public.property_tenants (profile_id) where active;
create index property_tenants_property_idx on public.property_tenants (property_id) where active;

-- Um imóvel tem no máximo um locatário ativo por vez.
create unique index property_tenants_one_active_per_property
  on public.property_tenants (property_id) where active;

-- ─── Equipe de campo ────────────────────────────────────────────────────────

create table public.technicians (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles (id) on delete set null,
  name text not null check (length(trim(name)) > 0),
  team text not null default '',
  specialties text[] not null default '{}',
  phone text,
  email text,
  avatar_url text,
  status public.technician_status not null default 'disponivel',
  rating numeric(2, 1) check (rating is null or rating between 0 and 5),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.technicians.profile_id is
  'Nulo para técnico que ainda não tem login. O vínculo é o que dá acesso à própria agenda.';

-- ─── Chamado (agregado raiz) ────────────────────────────────────────────────

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  protocol text not null unique
    default '#' || nextval('public.ticket_protocol_seq')::text,

  property_id uuid not null references public.properties (id) on delete restrict,
  agency_id uuid not null references public.agencies (id) on delete restrict,
  tenant_profile_id uuid references public.profiles (id) on delete set null,
  created_by uuid not null references public.profiles (id) on delete restrict,

  environment text not null check (length(trim(environment)) > 0),
  category public.category not null,
  description text not null check (length(trim(description)) > 0),
  urgency public.priority_level not null default 'normal',
  preferred_period public.preferred_period not null default 'manha',

  status public.ticket_status not null default 'chamado_aberto',
  assigned_technician_id uuid references public.technicians (id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_action_at timestamptz not null default now()
);

comment on table public.tickets is
  'Agregado raiz. agency_id é desnormalizado de properties para que a política RLS '
  'da imobiliária não precise de subconsulta em toda leitura.';

create index tickets_property_idx on public.tickets (property_id);
create index tickets_agency_idx on public.tickets (agency_id);
create index tickets_tenant_idx on public.tickets (tenant_profile_id);
create index tickets_technician_idx on public.tickets (assigned_technician_id);
create index tickets_status_idx on public.tickets (status);
create index tickets_created_at_idx on public.tickets (created_at desc);

-- ─── Timeline: o diferencial do produto ─────────────────────────────────────
-- Append-only por política RLS: existem INSERT e SELECT, não existem UPDATE e DELETE.
create table public.ticket_timeline (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  status public.ticket_status not null,
  title text not null,
  description text not null default '',
  author_profile_id uuid references public.profiles (id) on delete set null,
  author_name text not null,
  author_role public.user_role not null,
  created_at timestamptz not null default now()
);

comment on table public.ticket_timeline is
  'Histórico auditável, append-only. author_name é gravado junto com o id para que o '
  'registro continue legível mesmo se o perfil for removido depois.';

create index ticket_timeline_ticket_idx on public.ticket_timeline (ticket_id, created_at);

-- ─── Chat ───────────────────────────────────────────────────────────────────

create table public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  sender_profile_id uuid references public.profiles (id) on delete set null,
  sender_name text not null,
  sender_role public.user_role not null,
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

create index ticket_messages_ticket_idx on public.ticket_messages (ticket_id, created_at);

-- ─── Anexos ─────────────────────────────────────────────────────────────────

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  kind public.attachment_kind not null,
  storage_path text not null,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on column public.attachments.storage_path is
  'Caminho no bucket privado ticket-photos. O protótipo guardava base64 no localStorage '
  'e estourava a cota do navegador.';

create index attachments_ticket_idx on public.attachments (ticket_id, kind);

-- ─── Parecer técnico ────────────────────────────────────────────────────────

create table public.technical_reports (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null unique references public.tickets (id) on delete cascade,
  technician_id uuid references public.technicians (id) on delete set null,
  technician_name text not null,
  tenant_problem text not null default '',
  situation_found text not null default '',
  possible_cause text not null default '',
  recommended_solution text not null default '',
  required_materials text not null default '',
  needs_quote boolean not null default true,
  needs_return boolean not null default false,
  recommended_priority public.priority_level not null default 'normal',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Orçamento ──────────────────────────────────────────────────────────────
-- Várias versões por chamado. O protótipo tinha no máximo uma e "Editar Orçamento"
-- sobrescrevia a anterior — inclusive uma reprovada, apagando o motivo da recusa.
create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  version integer not null,

  service_description text not null default '',
  materials_summary text not null default '',
  labor_summary text not null default '',
  materials_cost numeric(12, 2) not null default 0 check (materials_cost >= 0),
  labor_cost numeric(12, 2) not null default 0 check (labor_cost >= 0),
  total_cost numeric(12, 2) generated always as (materials_cost + labor_cost) stored,
  execution_deadline_days integer not null default 1 check (execution_deadline_days > 0),
  notes text,

  status public.quote_status not null default 'enviado',
  rejection_reason text,
  approved_at timestamptz,
  approved_by uuid references public.profiles (id) on delete set null,
  rejected_at timestamptz,
  rejected_by uuid references public.profiles (id) on delete set null,

  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),

  unique (ticket_id, version),

  -- Reprovar exige motivo (CLAUDE.md §8). No protótipo isso era validado só na UI.
  constraint quote_rejection_needs_reason check (
    status <> 'reprovado' or length(trim(coalesce(rejection_reason, ''))) > 0
  )
);

comment on column public.quotes.total_cost is
  'Coluna gerada: materiais + mão de obra. Sem imposto, desconto ou taxa de administração.';

create index quotes_ticket_idx on public.quotes (ticket_id, version desc);

-- ─── Agendamento ────────────────────────────────────────────────────────────

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references public.tickets (id) on delete cascade,
  technician_id uuid not null references public.technicians (id) on delete restrict,

  starts_at timestamptz not null,
  ends_at timestamptz not null,

  service_type text not null default '',
  notes text,
  status public.appointment_status not null default 'agendado',
  tenant_confirmed boolean not null default false,
  tenant_confirmed_at timestamptz,

  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint appointment_ends_after_start check (ends_at > starts_at)
);

comment on table public.appointments is
  'Janela de atendimento em timestamptz — o protótipo usava data + HH:MM em texto. '
  'Não há mais cópia embutida no chamado: a lista global é a única fonte de verdade.';

-- A regra de conflito de agenda (CLAUDE.md §7) como garantia do banco, não como
-- verificação da aplicação. Dois operadores agendando o mesmo técnico no mesmo
-- instante: um dos dois recebe erro. Encostar não é sobrepor — `&&` sobre
-- tstzrange é [início, fim), então 09–11 e 11–13 convivem.
alter table public.appointments
  add constraint appointments_no_overlap_per_technician
  exclude using gist (
    technician_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status not in ('cancelado', 'nao_realizado'));

create index appointments_ticket_idx on public.appointments (ticket_id);
create index appointments_technician_idx on public.appointments (technician_id, starts_at);
create index appointments_starts_at_idx on public.appointments (starts_at);

-- ─── Conclusão do serviço ───────────────────────────────────────────────────

create table public.service_completions (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null unique references public.tickets (id) on delete cascade,
  services_performed text not null default '',
  materials_used text not null default '',
  warranty_months integer not null default 3 check (warranty_months >= 0),
  observations text not null default '',
  tenant_confirmed boolean not null default false,
  tenant_confirmed_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  completed_at timestamptz not null default now()
);

comment on column public.service_completions.warranty_months is
  'Registrado e exibido. O sistema NÃO avisa no vencimento — ver docs/LACUNAS-FUNCIONAIS.md.';

-- ─── Avaliação ──────────────────────────────────────────────────────────────

create table public.evaluations (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null unique references public.tickets (id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  solved boolean not null default true,
  satisfactory boolean not null default true,
  punctual boolean not null default true,
  comments text not null default '',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ─── Notificações ───────────────────────────────────────────────────────────
-- Uma linha POR DESTINATÁRIO. O protótipo tinha targetRoles[] com um único campo
-- `read` global — o que não sobrevive a vários usuários, porque "lido" é de cada pessoa.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_profile_id uuid not null references public.profiles (id) on delete cascade,
  ticket_id uuid references public.tickets (id) on delete cascade,
  title text not null,
  body text not null default '',
  type public.notification_type not null default 'info',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_recipient_idx
  on public.notifications (recipient_profile_id, created_at desc);
create index notifications_unread_idx
  on public.notifications (recipient_profile_id) where read_at is null;

-- ─── updated_at automático ──────────────────────────────────────────────────

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger agencies_touch before update on public.agencies
  for each row execute function public.touch_updated_at();
create trigger properties_touch before update on public.properties
  for each row execute function public.touch_updated_at();
create trigger technicians_touch before update on public.technicians
  for each row execute function public.touch_updated_at();
create trigger technical_reports_touch before update on public.technical_reports
  for each row execute function public.touch_updated_at();
create trigger appointments_touch before update on public.appointments
  for each row execute function public.touch_updated_at();
