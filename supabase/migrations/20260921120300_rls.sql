-- ════════════════════════════════════════════════════════════════════════════
-- Row Level Security
--
-- Tradução da tabela de isolamento do CLAUDE.md §6 para política de banco.
-- Enquanto o filtro de src/domain/access.ts é apresentação, isto é segurança:
-- vale para o DevTools, para o curl e para qualquer cliente que tenha a anon key.
--
-- Princípio: negar por padrão. Toda tabela liga RLS e nenhuma tem política
-- permissiva de escrita — mutação de domínio passa pelas funções RPC, que
-- validam a máquina de estados antes de gravar.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.profiles          enable row level security;
alter table public.agencies          enable row level security;
alter table public.agency_members    enable row level security;
alter table public.properties        enable row level security;
alter table public.property_tenants  enable row level security;
alter table public.technicians       enable row level security;
alter table public.tickets           enable row level security;
alter table public.ticket_timeline   enable row level security;
alter table public.ticket_messages   enable row level security;
alter table public.attachments       enable row level security;
alter table public.technical_reports enable row level security;
alter table public.quotes            enable row level security;
alter table public.appointments      enable row level security;
alter table public.service_completions enable row level security;
alter table public.evaluations       enable row level security;
alter table public.notifications     enable row level security;

-- O papel `anon` não enxerga nada: não existe área pública neste produto.
revoke all on all tables in schema public from anon;

-- ─── profiles ───────────────────────────────────────────────────────────────

-- Cada um vê o próprio perfil; a central vê todos.
-- Os demais veem apenas quem aparece nos chamados que já enxergam — o nome do
-- técnico e o do inquilino, portanto, não vazam lista de usuários.
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or public.is_empresa()
  );

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select p.role from public.profiles p where p.id = auth.uid()));

comment on policy profiles_update_self on public.profiles is
  'O usuário edita o próprio perfil mas NÃO o próprio papel — senão qualquer '
  'inquilino viraria empresa e enxergaria a carteira inteira.';

-- Criação e desativação de usuário são operação administrativa: passam pela
-- Vercel Function com service_role (Etapa 7), que não é submetida à RLS.

-- ─── agencies ───────────────────────────────────────────────────────────────

create policy agencies_select on public.agencies
  for select to authenticated
  using (
    public.is_empresa()
    or id = any (public.auth_agency_ids())
    -- O inquilino enxerga a imobiliária que administra o imóvel dele.
    or exists (
      select 1 from public.properties p
      where p.agency_id = agencies.id
        and p.id = any (public.auth_property_ids())
    )
  );

create policy agencies_manage on public.agencies
  for all to authenticated
  using (public.is_empresa())
  with check (public.is_empresa());

-- ─── agency_members ─────────────────────────────────────────────────────────

create policy agency_members_select on public.agency_members
  for select to authenticated
  using (public.is_empresa() or profile_id = auth.uid());

create policy agency_members_manage on public.agency_members
  for all to authenticated
  using (public.is_empresa())
  with check (public.is_empresa());

-- ─── properties ─────────────────────────────────────────────────────────────

create policy properties_select on public.properties
  for select to authenticated
  using (
    public.is_empresa()
    or agency_id = any (public.auth_agency_ids())
    or id = any (public.auth_property_ids())
    -- O técnico enxerga o imóvel de um chamado atribuído a ele.
    or exists (
      select 1 from public.tickets t
      where t.property_id = properties.id
        and t.assigned_technician_id is not null
        and t.assigned_technician_id = public.auth_technician_id()
    )
  );

create policy properties_manage on public.properties
  for all to authenticated
  using (public.is_empresa() or agency_id = any (public.auth_agency_ids()))
  with check (public.is_empresa() or agency_id = any (public.auth_agency_ids()));

-- ─── property_tenants ───────────────────────────────────────────────────────

create policy property_tenants_select on public.property_tenants
  for select to authenticated
  using (
    public.is_empresa()
    or profile_id = auth.uid()
    or exists (
      select 1 from public.properties p
      where p.id = property_tenants.property_id
        and p.agency_id = any (public.auth_agency_ids())
    )
  );

create policy property_tenants_manage on public.property_tenants
  for all to authenticated
  using (
    public.is_empresa()
    or exists (
      select 1 from public.properties p
      where p.id = property_tenants.property_id
        and p.agency_id = any (public.auth_agency_ids())
    )
  )
  with check (
    public.is_empresa()
    or exists (
      select 1 from public.properties p
      where p.id = property_tenants.property_id
        and p.agency_id = any (public.auth_agency_ids())
    )
  );

-- ─── technicians ────────────────────────────────────────────────────────────
-- Equipe é operação interna da prestadora. Inquilino e imobiliária só veem o
-- técnico designado a um chamado que já enxergam — não a equipe inteira.
create policy technicians_select on public.technicians
  for select to authenticated
  using (
    public.is_empresa()
    or profile_id = auth.uid()
    or exists (
      select 1 from public.tickets t
      where t.assigned_technician_id = technicians.id
        and public.can_read_ticket(t.id)
    )
  );

create policy technicians_manage on public.technicians
  for all to authenticated
  using (public.is_empresa())
  with check (public.is_empresa());

-- ─── tickets ────────────────────────────────────────────────────────────────

create policy tickets_select on public.tickets
  for select to authenticated
  using (
    public.is_empresa()
    or (public.auth_role() = 'imobiliaria' and agency_id = any (public.auth_agency_ids()))
    or (public.auth_role() = 'inquilino' and property_id = any (public.auth_property_ids()))
    or (
      public.auth_role() = 'prestador'
      and assigned_technician_id is not null
      and assigned_technician_id = public.auth_technician_id()
    )
  );

comment on policy tickets_select on public.tickets is
  'A regra crítica do produto. Casamento por chave estrangeira — o protótipo comparava '
  'endereço com includes() e expunha o chamado do vizinho de andar.';

-- Abertura de chamado: o inquilino só abre para o próprio imóvel.
create policy tickets_insert on public.tickets
  for insert to authenticated
  with check (
    public.is_empresa()
    or (public.auth_role() = 'imobiliaria' and agency_id = any (public.auth_agency_ids()))
    or (public.auth_role() = 'inquilino' and property_id = any (public.auth_property_ids()))
  );

-- UPDATE é permitido a quem enxerga, mas o trigger da máquina de estados
-- (migration seguinte) recusa qualquer transição fora de ordem.
create policy tickets_update on public.tickets
  for update to authenticated
  using (public.can_read_ticket(id))
  with check (public.can_read_ticket(id));

-- Sem política de DELETE: chamado não se apaga, se cancela.

-- ─── ticket_timeline — append-only ──────────────────────────────────────────
-- Existem SELECT e INSERT. A ausência de UPDATE e DELETE é intencional e é o
-- que transforma "timeline auditável" de promessa em garantia do banco.
create policy timeline_select on public.ticket_timeline
  for select to authenticated
  using (public.can_read_ticket(ticket_id));

create policy timeline_insert on public.ticket_timeline
  for insert to authenticated
  with check (public.can_read_ticket(ticket_id));

-- ─── ticket_messages ────────────────────────────────────────────────────────
-- O inquilino participa do chat (diferente das demais tabelas de escrita).
create policy messages_select on public.ticket_messages
  for select to authenticated
  using (public.can_read_ticket(ticket_id));

create policy messages_insert on public.ticket_messages
  for insert to authenticated
  with check (public.can_read_ticket(ticket_id) and sender_profile_id = auth.uid());

-- ─── attachments ────────────────────────────────────────────────────────────

create policy attachments_select on public.attachments
  for select to authenticated
  using (public.can_read_ticket(ticket_id));

create policy attachments_insert on public.attachments
  for insert to authenticated
  with check (public.can_read_ticket(ticket_id) and uploaded_by = auth.uid());

create policy attachments_delete on public.attachments
  for delete to authenticated
  using (public.is_empresa() or uploaded_by = auth.uid());

-- ─── technical_reports ──────────────────────────────────────────────────────
-- Leitura para todos que enxergam o chamado — transparência é o produto.
-- Escrita só para quem executa: empresa e prestador.
create policy reports_select on public.technical_reports
  for select to authenticated
  using (public.can_read_ticket(ticket_id));

create policy reports_write on public.technical_reports
  for all to authenticated
  using (
    public.can_read_ticket(ticket_id)
    and public.auth_role() in ('empresa', 'prestador')
  )
  with check (
    public.can_read_ticket(ticket_id)
    and public.auth_role() in ('empresa', 'prestador')
  );

-- ─── quotes ─────────────────────────────────────────────────────────────────
-- A imobiliária lê e aprova; quem cria é a prestadora.
create policy quotes_select on public.quotes
  for select to authenticated
  using (public.can_read_ticket(ticket_id));

create policy quotes_insert on public.quotes
  for insert to authenticated
  with check (public.can_read_ticket(ticket_id) and public.is_empresa());

create policy quotes_update on public.quotes
  for update to authenticated
  using (
    public.can_read_ticket(ticket_id)
    and public.auth_role() in ('empresa', 'imobiliaria')
  )
  with check (
    public.can_read_ticket(ticket_id)
    and public.auth_role() in ('empresa', 'imobiliaria')
  );

-- ─── appointments ───────────────────────────────────────────────────────────

create policy appointments_select on public.appointments
  for select to authenticated
  using (
    public.is_empresa()
    or (ticket_id is not null and public.can_read_ticket(ticket_id))
    or (technician_id is not null and technician_id = public.auth_technician_id())
  );

create policy appointments_insert on public.appointments
  for insert to authenticated
  with check (public.is_empresa());

-- O inquilino precisa de UPDATE para confirmar presença; o técnico, para
-- atualizar o próprio status em campo.
create policy appointments_update on public.appointments
  for update to authenticated
  using (
    public.is_empresa()
    or (technician_id = public.auth_technician_id())
    or (ticket_id is not null and public.can_read_ticket(ticket_id))
  )
  with check (
    public.is_empresa()
    or (technician_id = public.auth_technician_id())
    or (ticket_id is not null and public.can_read_ticket(ticket_id))
  );

-- ─── service_completions ────────────────────────────────────────────────────

create policy completions_select on public.service_completions
  for select to authenticated
  using (public.can_read_ticket(ticket_id));

create policy completions_insert on public.service_completions
  for insert to authenticated
  with check (
    public.can_read_ticket(ticket_id)
    and public.auth_role() in ('empresa', 'prestador')
  );

-- O aceite do inquilino é um UPDATE nesta tabela, daí ele aparecer aqui.
create policy completions_update on public.service_completions
  for update to authenticated
  using (public.can_read_ticket(ticket_id))
  with check (public.can_read_ticket(ticket_id));

-- ─── evaluations ────────────────────────────────────────────────────────────
-- Quem avalia é o inquilino. A nota alimenta o CSAT que a imobiliária vê.
create policy evaluations_select on public.evaluations
  for select to authenticated
  using (public.can_read_ticket(ticket_id));

create policy evaluations_insert on public.evaluations
  for insert to authenticated
  with check (
    public.can_read_ticket(ticket_id)
    and public.auth_role() = 'inquilino'
    and created_by = auth.uid()
  );

-- ─── notifications ──────────────────────────────────────────────────────────
-- Estritamente pessoal: nem a central lê a caixa dos outros.
create policy notifications_select on public.notifications
  for select to authenticated
  using (recipient_profile_id = auth.uid());

create policy notifications_update on public.notifications
  for update to authenticated
  using (recipient_profile_id = auth.uid())
  with check (recipient_profile_id = auth.uid());

comment on policy notifications_select on public.notifications is
  'Sem exceção para empresa: "lido" é estado pessoal, não dado operacional.';
