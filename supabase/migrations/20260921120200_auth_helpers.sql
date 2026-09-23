-- ════════════════════════════════════════════════════════════════════════════
-- Funções auxiliares de autorização
--
-- Todas são SECURITY DEFINER e STABLE:
--   • DEFINER porque precisam ler `profiles` sem passar pela RLS de `profiles`
--     — caso contrário a política que consulta o papel dependeria dela mesma.
--   • STABLE para o planner avaliar uma vez por query em vez de uma vez por linha.
--
-- `search_path` é fixado em toda função SECURITY DEFINER: sem isso, um schema
-- malicioso no search_path do chamador poderia sequestrar a resolução de nomes.
-- ════════════════════════════════════════════════════════════════════════════

-- Papel do usuário autenticado. Nulo quando não há sessão ou o perfil está inativo.
create or replace function public.auth_role()
returns public.user_role
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid() and p.active
$$;

comment on function public.auth_role() is
  'Papel do usuário da sessão. Base de toda política RLS.';

-- Atalho de leitura: a central da prestadora enxerga tudo.
create or replace function public.is_empresa()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(public.auth_role() = 'empresa', false)
$$;

-- Imobiliárias às quais o usuário pertence. Array para suportar, no futuro,
-- alguém que administre mais de uma carteira sem mudar nenhuma política.
create or replace function public.auth_agency_ids()
returns uuid[]
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(array_agg(am.agency_id), '{}')
  from public.agency_members am
  where am.profile_id = auth.uid()
$$;

-- Técnico vinculado ao usuário. Nulo para quem não é prestador.
create or replace function public.auth_technician_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select t.id
  from public.technicians t
  where t.profile_id = auth.uid() and t.active
$$;

-- Imóveis em que o usuário é o locatário ATIVO.
create or replace function public.auth_property_ids()
returns uuid[]
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(array_agg(pt.property_id), '{}')
  from public.property_tenants pt
  where pt.profile_id = auth.uid() and pt.active
$$;

-- ─── A regra de visibilidade do chamado, em um só lugar ─────────────────────
-- Tradução direta da tabela de isolamento do CLAUDE.md §6. As tabelas filhas
-- (timeline, chat, orçamento, anexos…) herdam a visibilidade daqui, em vez de
-- cada uma repetir a lógica e arriscar divergir.
create or replace function public.can_read_ticket(p_ticket_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.tickets t
    where t.id = p_ticket_id
      and (
        public.auth_role() = 'empresa'
        or (public.auth_role() = 'imobiliaria' and t.agency_id = any (public.auth_agency_ids()))
        or (public.auth_role() = 'inquilino' and t.property_id = any (public.auth_property_ids()))
        or (
          public.auth_role() = 'prestador'
          and t.assigned_technician_id is not null
          and t.assigned_technician_id = public.auth_technician_id()
        )
      )
  )
$$;

comment on function public.can_read_ticket(uuid) is
  'Fonte única da visibilidade de um chamado — espelha src/domain/access.ts.';

-- Quem pode escrever no chamado (chat, anexo, parecer…). Mesma visibilidade,
-- exceto o inquilino, que participa do chat mas não edita registro técnico.
create or replace function public.can_write_ticket(p_ticket_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.can_read_ticket(p_ticket_id)
     and public.auth_role() in ('empresa', 'imobiliaria', 'prestador')
$$;

-- ─── Permissões de execução ─────────────────────────────────────────────────
-- Usuário anônimo não precisa de nenhuma delas: não há área pública.
revoke all on function public.auth_role() from public, anon;
revoke all on function public.is_empresa() from public, anon;
revoke all on function public.auth_agency_ids() from public, anon;
revoke all on function public.auth_technician_id() from public, anon;
revoke all on function public.auth_property_ids() from public, anon;
revoke all on function public.can_read_ticket(uuid) from public, anon;
revoke all on function public.can_write_ticket(uuid) from public, anon;

grant execute on function public.auth_role() to authenticated;
grant execute on function public.is_empresa() to authenticated;
grant execute on function public.auth_agency_ids() to authenticated;
grant execute on function public.auth_technician_id() to authenticated;
grant execute on function public.auth_property_ids() to authenticated;
grant execute on function public.can_read_ticket(uuid) to authenticated;
grant execute on function public.can_write_ticket(uuid) to authenticated;
