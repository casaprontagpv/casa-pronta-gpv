-- ════════════════════════════════════════════════════════════════════════════
-- Máquina de estados do chamado
--
-- Traduz o diagrama do CLAUDE.md §5 para uma tabela de transições permitidas,
-- validada por trigger. No protótipo `updateTicketStatus` aceitava QUALQUER
-- destino: as ações ficavam escondidas na UI conforme o status, mas nada impedia
-- um chamado recém-aberto de pular direto para "concluído".
-- ════════════════════════════════════════════════════════════════════════════

create table public.ticket_status_transitions (
  from_status public.ticket_status not null,
  to_status public.ticket_status not null,
  allowed_role public.user_role not null,
  primary key (from_status, to_status, allowed_role)
);

comment on table public.ticket_status_transitions is
  'Transições permitidas por papel. Tabela, e não CASE no código, para que a regra '
  'seja consultável e para que adicionar um caminho novo seja uma linha de INSERT.';

alter table public.ticket_status_transitions enable row level security;

create policy transitions_select on public.ticket_status_transitions
  for select to authenticated using (true);

-- ─── Caminho feliz ──────────────────────────────────────────────────────────
insert into public.ticket_status_transitions (from_status, to_status, allowed_role) values
  -- Imobiliária analisa e autoriza a vistoria.
  ('chamado_aberto',      'em_analise',          'imobiliaria'),
  ('chamado_aberto',      'em_analise',          'empresa'),

  -- Parecer técnico com needsQuote = true.
  ('em_analise',          'aguardando_vistoria', 'empresa'),
  ('em_analise',          'aguardando_vistoria', 'prestador'),
  ('chamado_aberto',      'aguardando_vistoria', 'empresa'),

  -- Prestadora envia orçamento.
  ('aguardando_vistoria', 'orcamento_enviado',   'empresa'),
  ('em_analise',          'orcamento_enviado',   'empresa'),
  ('orcamento_reprovado', 'orcamento_enviado',   'empresa'),

  -- Decisão da imobiliária (reprovar exige motivo — constraint em `quotes`).
  ('orcamento_enviado',   'orcamento_aprovado',  'imobiliaria'),
  ('orcamento_enviado',   'orcamento_aprovado',  'empresa'),
  ('orcamento_enviado',   'orcamento_reprovado', 'imobiliaria'),
  ('orcamento_enviado',   'orcamento_reprovado', 'empresa'),

  -- Agendamento. Também a partir de aguardando_vistoria, para o caso em que o
  -- parecer dispensa orçamento (needsQuote = false).
  ('orcamento_aprovado',  'servico_agendado',    'empresa'),
  ('aguardando_vistoria', 'servico_agendado',    'empresa'),
  ('em_analise',          'servico_agendado',    'empresa'),

  -- Execução em campo.
  ('servico_agendado',    'em_execucao',         'empresa'),
  ('servico_agendado',    'em_execucao',         'prestador'),

  -- Conclusão.
  ('em_execucao',         'concluido',           'empresa'),
  ('em_execucao',         'concluido',           'prestador'),
  ('servico_agendado',    'concluido',           'empresa'),
  ('servico_agendado',    'concluido',           'prestador');

-- ─── Estados laterais ───────────────────────────────────────────────────────
-- `pendente` (falta peça / precisa de retorno): entra e sai de qualquer etapa ativa.
insert into public.ticket_status_transitions (from_status, to_status, allowed_role)
select s, 'pendente', r
from unnest(array[
  'em_analise', 'aguardando_vistoria', 'orcamento_enviado',
  'orcamento_aprovado', 'servico_agendado', 'em_execucao'
]::public.ticket_status[]) s
cross join unnest(array['empresa', 'prestador']::public.user_role[]) r;

insert into public.ticket_status_transitions (from_status, to_status, allowed_role)
select 'pendente', s, r
from unnest(array[
  'em_analise', 'aguardando_vistoria', 'orcamento_enviado',
  'orcamento_aprovado', 'servico_agendado', 'em_execucao'
]::public.ticket_status[]) s
cross join unnest(array['empresa', 'prestador']::public.user_role[]) r;

-- Cancelamento: possível de qualquer estado não terminal, por empresa ou imobiliária.
insert into public.ticket_status_transitions (from_status, to_status, allowed_role)
select s, 'cancelado', r
from unnest(array[
  'chamado_aberto', 'em_analise', 'aguardando_vistoria', 'orcamento_enviado',
  'aguardando_aprovacao', 'orcamento_aprovado', 'orcamento_reprovado',
  'servico_agendado', 'em_execucao', 'pendente'
]::public.ticket_status[]) s
cross join unnest(array['empresa', 'imobiliaria']::public.user_role[]) r;

-- `concluido` e `cancelado` são terminais: não há nenhuma transição saindo deles.
-- O aceite do inquilino e a avaliação acontecem DEPOIS de concluido e não mudam
-- o status (CLAUDE.md §5, regras 8 e 9).

-- ─── O trigger ──────────────────────────────────────────────────────────────

create or replace function public.enforce_ticket_status_transition()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role public.user_role;
begin
  if new.status = old.status then
    return new;
  end if;

  v_role := public.auth_role();

  -- Operação administrativa (service_role, seed, migration) não tem perfil na
  -- sessão. Nesse caso confiamos no chamador: é código do servidor, não do usuário.
  if v_role is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.ticket_status_transitions tr
    where tr.from_status = old.status
      and tr.to_status = new.status
      and tr.allowed_role = v_role
  ) then
    raise exception
      'Transição de status não permitida: % → % para o papel %',
      old.status, new.status, v_role
      using errcode = 'check_violation';
  end if;

  new.updated_at := now();
  new.last_action_at := now();
  return new;
end;
$$;

create trigger tickets_enforce_status_transition
  before update of status on public.tickets
  for each row execute function public.enforce_ticket_status_transition();

comment on function public.enforce_ticket_status_transition() is
  'Recusa transição fora da tabela de caminhos permitidos. É a garantia que o '
  'protótipo não tinha: lá as ações só ficavam escondidas na interface.';
