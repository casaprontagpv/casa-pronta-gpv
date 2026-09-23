-- ════════════════════════════════════════════════════════════════════════════
-- Casos de uso (RPC)
--
-- Cada ação de src/context/AppContext.tsx vira uma função aqui. Todas escrevem
-- em mais de uma tabela (registro + timeline + notificações) e por isso precisam
-- ser transacionais — não dá para deixar a cargo de três chamadas do cliente.
--
-- SECURITY INVOKER (padrão) de propósito: a RLS continua valendo dentro da
-- função. A exceção é o fan-out de notificações, que precisa escrever na caixa
-- de OUTROS usuários e por isso é DEFINER.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Helpers internos ───────────────────────────────────────────────────────

create or replace function public.current_profile()
returns public.profiles
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select * from public.profiles where id = auth.uid() and active
$$;

grant execute on function public.current_profile() to authenticated;

-- Registra um evento na timeline com autoria de quem está na sessão.
create or replace function public.log_timeline(
  p_ticket_id uuid,
  p_status public.ticket_status,
  p_title text,
  p_description text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile public.profiles;
  v_id uuid;
begin
  v_profile := public.current_profile();

  insert into public.ticket_timeline (
    ticket_id, status, title, description,
    author_profile_id, author_name, author_role
  )
  values (
    p_ticket_id, p_status, p_title, coalesce(p_description, ''),
    v_profile.id,
    coalesce(v_profile.name, 'Sistema'),
    coalesce(v_profile.role, 'empresa')
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- Fan-out de notificação: expande papéis para as PESSOAS que enxergam o chamado.
-- O protótipo gravava `targetRoles[]` num registro só, com um `read` global —
-- o que não sobrevive a vários usuários, porque "lido" é de cada pessoa.
create or replace function public.notify_ticket(
  p_ticket_id uuid,
  p_roles public.user_role[],
  p_title text,
  p_body text default '',
  p_type public.notification_type default 'info'
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ticket public.tickets;
  v_count integer;
begin
  select * into v_ticket from public.tickets where id = p_ticket_id;
  if not found then
    return 0;
  end if;

  with destinatarios as (
    -- Central da prestadora
    select p.id
    from public.profiles p
    where p.active and p.role = 'empresa' and 'empresa' = any (p_roles)

    union

    -- Imobiliária que administra o imóvel
    select am.profile_id
    from public.agency_members am
    join public.profiles p on p.id = am.profile_id and p.active
    where am.agency_id = v_ticket.agency_id and 'imobiliaria' = any (p_roles)

    union

    -- Locatário ativo do imóvel
    select pt.profile_id
    from public.property_tenants pt
    join public.profiles p on p.id = pt.profile_id and p.active
    where pt.property_id = v_ticket.property_id and pt.active
      and 'inquilino' = any (p_roles)

    union

    -- Técnico designado
    select t.profile_id
    from public.technicians t
    join public.profiles p on p.id = t.profile_id and p.active
    where t.id = v_ticket.assigned_technician_id and 'prestador' = any (p_roles)
  )
  insert into public.notifications (recipient_profile_id, ticket_id, title, body, type)
  select d.id, p_ticket_id, p_title, coalesce(p_body, ''), p_type
  from destinatarios d
  where d.id is not null
    -- Não notifica quem acabou de executar a ação.
    and d.id is distinct from auth.uid();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

comment on function public.notify_ticket is
  'Expande papéis para destinatários reais, respeitando quem enxerga o chamado. '
  'Quem disparou a ação não recebe notificação da própria ação.';

-- ─── Abertura do chamado ────────────────────────────────────────────────────

create or replace function public.create_ticket(
  p_property_id uuid,
  p_environment text,
  p_category public.category,
  p_description text,
  p_urgency public.priority_level default 'normal',
  p_preferred_period public.preferred_period default 'manha'
)
returns public.tickets
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_ticket public.tickets;
  v_agency_id uuid;
  v_tenant_id uuid;
  v_profile public.profiles;
begin
  v_profile := public.current_profile();
  if v_profile.id is null then
    raise exception 'Sessão não autenticada' using errcode = 'insufficient_privilege';
  end if;

  select agency_id into v_agency_id from public.properties where id = p_property_id;
  if v_agency_id is null then
    raise exception 'Imóvel não encontrado' using errcode = 'foreign_key_violation';
  end if;

  -- Locatário ativo do imóvel, que pode não ser quem abriu (a imobiliária também abre).
  select pt.profile_id into v_tenant_id
  from public.property_tenants pt
  where pt.property_id = p_property_id and pt.active
  limit 1;

  insert into public.tickets (
    property_id, agency_id, tenant_profile_id, created_by,
    environment, category, description, urgency, preferred_period
  )
  values (
    p_property_id, v_agency_id, v_tenant_id, v_profile.id,
    p_environment, p_category, p_description, p_urgency, p_preferred_period
  )
  returning * into v_ticket;

  perform public.log_timeline(
    v_ticket.id, 'chamado_aberto', 'Chamado Aberto',
    'Chamado registrado com sucesso. Aguardando análise da imobiliária.'
  );

  perform public.notify_ticket(
    v_ticket.id,
    array['imobiliaria', 'empresa']::public.user_role[],
    'Novo Chamado ' || v_ticket.protocol,
    format('%s abriu um chamado de %s em %s.', v_profile.name, p_category, p_environment),
    (case when p_urgency = 'emergencial' then 'urgent' else 'info' end)::public.notification_type
  );

  return v_ticket;
end;
$$;

-- ─── Transição de status ────────────────────────────────────────────────────

create or replace function public.update_ticket_status(
  p_ticket_id uuid,
  p_status public.ticket_status,
  p_description text default null
)
returns public.tickets
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_ticket public.tickets;
  v_title text;
begin
  -- O trigger da máquina de estados recusa transição fora de ordem.
  update public.tickets set status = p_status
  where id = p_ticket_id
  returning * into v_ticket;

  if not found then
    raise exception 'Chamado não encontrado ou sem permissão'
      using errcode = 'insufficient_privilege';
  end if;

  v_title := public.ticket_status_label(p_status);

  perform public.log_timeline(
    p_ticket_id, p_status, v_title,
    coalesce(p_description, 'Status alterado para "' || v_title || '".')
  );

  perform public.notify_ticket(
    p_ticket_id,
    array['inquilino', 'imobiliaria', 'empresa', 'prestador']::public.user_role[],
    'Atualização no Chamado ' || v_ticket.protocol,
    coalesce(p_description, 'O status mudou para: ' || v_title || '.'),
    (case
      when p_status = 'concluido' then 'success'
      when p_status in ('orcamento_reprovado', 'cancelado') then 'warning'
      else 'info'
    end)::public.notification_type
  );

  return v_ticket;
end;
$$;

-- Rótulos legíveis, espelhando `statusTitles` de AppContext e getStatusConfig.
create or replace function public.ticket_status_label(p_status public.ticket_status)
returns text
language sql
immutable
as $$
  select case p_status
    when 'chamado_aberto'       then 'Chamado Aberto'
    when 'em_analise'           then 'Em Análise pela Imobiliária'
    when 'aguardando_vistoria'  then 'Aguardando Vistoria / Agendamento'
    when 'orcamento_enviado'    then 'Orçamento Enviado'
    when 'aguardando_aprovacao' then 'Aguardando Aprovação de Orçamento'
    when 'orcamento_aprovado'   then 'Orçamento Aprovado'
    when 'orcamento_reprovado'  then 'Orçamento Reprovado'
    when 'servico_agendado'     then 'Serviço Agendado'
    when 'em_execucao'          then 'Serviço em Execução'
    when 'pendente'             then 'Chamado com Pendência'
    when 'concluido'            then 'Serviço Concluído'
    when 'cancelado'            then 'Chamado Cancelado'
  end
$$;

-- ─── Designação de técnico ──────────────────────────────────────────────────

create or replace function public.assign_technician(
  p_ticket_id uuid,
  p_technician_id uuid
)
returns public.tickets
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_ticket public.tickets;
  v_tech public.technicians;
begin
  select * into v_tech from public.technicians where id = p_technician_id and active;
  if not found then
    raise exception 'Técnico não encontrado' using errcode = 'foreign_key_violation';
  end if;

  update public.tickets
  set assigned_technician_id = p_technician_id, last_action_at = now()
  where id = p_ticket_id
  returning * into v_ticket;

  if not found then
    raise exception 'Chamado não encontrado ou sem permissão'
      using errcode = 'insufficient_privilege';
  end if;

  perform public.log_timeline(
    p_ticket_id, v_ticket.status, 'Prestador Designado',
    format('O técnico %s (%s) foi designado para o atendimento.', v_tech.name, v_tech.team)
  );

  perform public.notify_ticket(
    p_ticket_id,
    array['inquilino', 'imobiliaria', 'prestador']::public.user_role[],
    'Técnico Designado ' || v_ticket.protocol,
    format('%s foi designado para o atendimento.', v_tech.name)
  );

  return v_ticket;
end;
$$;

-- ─── Chat ───────────────────────────────────────────────────────────────────

create or replace function public.post_message(p_ticket_id uuid, p_body text)
returns public.ticket_messages
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_profile public.profiles;
  v_message public.ticket_messages;
begin
  v_profile := public.current_profile();
  if v_profile.id is null then
    raise exception 'Sessão não autenticada' using errcode = 'insufficient_privilege';
  end if;

  insert into public.ticket_messages (
    ticket_id, sender_profile_id, sender_name, sender_role, body
  )
  values (p_ticket_id, v_profile.id, v_profile.name, v_profile.role, p_body)
  returning * into v_message;

  return v_message;
end;
$$;

-- ─── Parecer técnico ────────────────────────────────────────────────────────

create or replace function public.save_technical_report(
  p_ticket_id uuid,
  p_situation_found text,
  p_possible_cause text,
  p_recommended_solution text,
  p_required_materials text,
  p_needs_quote boolean,
  p_needs_return boolean,
  p_recommended_priority public.priority_level
)
returns public.technical_reports
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_ticket public.tickets;
  v_tech public.technicians;
  v_report public.technical_reports;
begin
  select * into v_ticket from public.tickets where id = p_ticket_id;
  if not found then
    raise exception 'Chamado não encontrado ou sem permissão'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_tech from public.technicians where id = v_ticket.assigned_technician_id;

  insert into public.technical_reports (
    ticket_id, technician_id, technician_name, tenant_problem,
    situation_found, possible_cause, recommended_solution, required_materials,
    needs_quote, needs_return, recommended_priority, created_by
  )
  values (
    p_ticket_id, v_tech.id, coalesce(v_tech.name, 'Técnico'), v_ticket.description,
    p_situation_found, p_possible_cause, p_recommended_solution, p_required_materials,
    p_needs_quote, p_needs_return, p_recommended_priority, auth.uid()
  )
  on conflict (ticket_id) do update set
    situation_found = excluded.situation_found,
    possible_cause = excluded.possible_cause,
    recommended_solution = excluded.recommended_solution,
    required_materials = excluded.required_materials,
    needs_quote = excluded.needs_quote,
    needs_return = excluded.needs_return,
    recommended_priority = excluded.recommended_priority
  returning * into v_report;

  -- O parecer sobrescreve a prioridade do chamado (CLAUDE.md §5, regra 3).
  update public.tickets
  set urgency = p_recommended_priority, last_action_at = now()
  where id = p_ticket_id;

  perform public.log_timeline(
    p_ticket_id,
    case when p_needs_quote then 'aguardando_vistoria'::public.ticket_status else v_ticket.status end,
    'Parecer Técnico Registrado',
    format('%s registrou o laudo: %s', v_report.technician_name, p_recommended_solution)
  );

  -- Só move o chamado quando o parecer pede orçamento.
  if p_needs_quote and v_ticket.status <> 'aguardando_vistoria' then
    update public.tickets set status = 'aguardando_vistoria' where id = p_ticket_id;
  end if;

  perform public.notify_ticket(
    p_ticket_id,
    array['imobiliaria', 'empresa']::public.user_role[],
    'Novo Parecer Técnico ' || v_ticket.protocol,
    'Verifique a solução recomendada e o orçamento.'
  );

  return v_report;
end;
$$;

-- ─── Orçamento ──────────────────────────────────────────────────────────────

create or replace function public.submit_quote(
  p_ticket_id uuid,
  p_service_description text,
  p_materials_summary text,
  p_labor_summary text,
  p_materials_cost numeric,
  p_labor_cost numeric,
  p_execution_deadline_days integer,
  p_notes text default null
)
returns public.quotes
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_ticket public.tickets;
  v_quote public.quotes;
  v_version integer;
begin
  select * into v_ticket from public.tickets where id = p_ticket_id;
  if not found then
    raise exception 'Chamado não encontrado ou sem permissão'
      using errcode = 'insufficient_privilege';
  end if;

  -- Nova versão em vez de sobrescrever: o histórico do que foi orçado e recusado
  -- é o que permite auditar um valor que a imobiliária aprova.
  select coalesce(max(version), 0) + 1 into v_version
  from public.quotes where ticket_id = p_ticket_id;

  insert into public.quotes (
    ticket_id, version, service_description, materials_summary, labor_summary,
    materials_cost, labor_cost, execution_deadline_days, notes, created_by
  )
  values (
    p_ticket_id, v_version, p_service_description, p_materials_summary, p_labor_summary,
    p_materials_cost, p_labor_cost, p_execution_deadline_days, p_notes, auth.uid()
  )
  returning * into v_quote;

  update public.tickets set status = 'orcamento_enviado' where id = p_ticket_id;

  perform public.log_timeline(
    p_ticket_id, 'orcamento_enviado', 'Orçamento Enviado para Aprovação',
    format('Orçamento de R$ %s disponibilizado para avaliação da imobiliária.',
           to_char(v_quote.total_cost, 'FM999G999D00'))
  );

  perform public.notify_ticket(
    p_ticket_id,
    array['imobiliaria', 'inquilino']::public.user_role[],
    'Orçamento Enviado ' || v_ticket.protocol,
    format('Orçamento de R$ %s aguardando aprovação.',
           to_char(v_quote.total_cost, 'FM999G999D00')),
    'warning'
  );

  return v_quote;
end;
$$;

create or replace function public.review_quote(
  p_quote_id uuid,
  p_approve boolean,
  p_reason text default null
)
returns public.quotes
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_quote public.quotes;
  v_ticket public.tickets;
begin
  select * into v_quote from public.quotes where id = p_quote_id;
  if not found then
    raise exception 'Orçamento não encontrado ou sem permissão'
      using errcode = 'insufficient_privilege';
  end if;

  if v_quote.status <> 'enviado' then
    raise exception 'Este orçamento já foi %', v_quote.status
      using errcode = 'check_violation';
  end if;

  -- Reprovar sem motivo é recusado também pela constraint da tabela; aqui a
  -- mensagem é legível para o usuário final.
  if not p_approve and length(trim(coalesce(p_reason, ''))) = 0 then
    raise exception 'Informe a justificativa da reprovação'
      using errcode = 'check_violation';
  end if;

  update public.quotes
  set status = case when p_approve then 'aprovado' else 'reprovado' end::public.quote_status,
      rejection_reason = case when p_approve then null else p_reason end,
      approved_at = case when p_approve then now() end,
      approved_by = case when p_approve then auth.uid() end,
      rejected_at = case when p_approve then null else now() end,
      rejected_by = case when p_approve then null else auth.uid() end
  where id = p_quote_id
  returning * into v_quote;

  update public.tickets
  set status = (case when p_approve then 'orcamento_aprovado' else 'orcamento_reprovado' end)::public.ticket_status
  where id = v_quote.ticket_id
  returning * into v_ticket;

  perform public.log_timeline(
    v_quote.ticket_id,
    (case when p_approve then 'orcamento_aprovado' else 'orcamento_reprovado' end)::public.ticket_status,
    case when p_approve then 'Orçamento Aprovado pela Imobiliária' else 'Orçamento Reprovado' end,
    case
      when p_approve then format('Orçamento de R$ %s aprovado. Liberado para agendamento.',
                                 to_char(v_quote.total_cost, 'FM999G999D00'))
      else 'Motivo: ' || p_reason
    end
  );

  perform public.notify_ticket(
    v_quote.ticket_id,
    array['empresa', 'prestador', 'inquilino']::public.user_role[],
    case when p_approve then 'Orçamento Aprovado ' else 'Orçamento Reprovado ' end || v_ticket.protocol,
    case when p_approve then 'O serviço já pode ser agendado.' else 'Motivo: ' || p_reason end,
    (case when p_approve then 'success' else 'warning' end)::public.notification_type
  );

  return v_quote;
end;
$$;

-- ─── Agendamento ────────────────────────────────────────────────────────────

create or replace function public.schedule_appointment(
  p_technician_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_ticket_id uuid default null,
  p_service_type text default '',
  p_notes text default null
)
returns public.appointments
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_appointment public.appointments;
  v_ticket public.tickets;
  v_tech public.technicians;
begin
  select * into v_tech from public.technicians where id = p_technician_id and active;
  if not found then
    raise exception 'Técnico não encontrado' using errcode = 'foreign_key_violation';
  end if;

  -- A constraint EXCLUDE recusa sobreposição. Traduzimos o erro do banco para
  -- uma mensagem que a interface pode mostrar direto ao operador.
  begin
    insert into public.appointments (
      ticket_id, technician_id, starts_at, ends_at, service_type, notes, created_by
    )
    values (
      p_ticket_id, p_technician_id, p_starts_at, p_ends_at,
      p_service_type, p_notes, auth.uid()
    )
    returning * into v_appointment;
  exception
    when exclusion_violation then
      raise exception
        'O técnico % já possui outro atendimento neste horário.', v_tech.name
        using errcode = 'exclusion_violation';
  end;

  if p_ticket_id is not null then
    update public.tickets
    set assigned_technician_id = p_technician_id,
        status = 'servico_agendado'
    where id = p_ticket_id
    returning * into v_ticket;

    perform public.log_timeline(
      p_ticket_id, 'servico_agendado', 'Serviço Agendado',
      format('Atendimento agendado para %s com o técnico %s.',
             to_char(p_starts_at at time zone 'America/Sao_Paulo', 'DD/MM/YYYY "às" HH24:MI'),
             v_tech.name)
    );

    perform public.notify_ticket(
      p_ticket_id,
      array['inquilino', 'prestador', 'imobiliaria', 'empresa']::public.user_role[],
      'Novo Atendimento Agendado',
      format('Serviço agendado para %s com %s.',
             to_char(p_starts_at at time zone 'America/Sao_Paulo', 'DD/MM/YYYY "às" HH24:MI'),
             v_tech.name)
    );
  end if;

  return v_appointment;
end;
$$;

create or replace function public.update_appointment_status(
  p_appointment_id uuid,
  p_status public.appointment_status
)
returns public.appointments
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_appointment public.appointments;
begin
  update public.appointments
  set status = p_status,
      tenant_confirmed = case when p_status = 'confirmado' then true else tenant_confirmed end,
      tenant_confirmed_at = case
        when p_status = 'confirmado' and not tenant_confirmed then now()
        else tenant_confirmed_at
      end
  where id = p_appointment_id
  returning * into v_appointment;

  if not found then
    raise exception 'Agendamento não encontrado ou sem permissão'
      using errcode = 'insufficient_privilege';
  end if;

  if v_appointment.ticket_id is not null then
    if p_status = 'em_atendimento' then
      perform public.update_ticket_status(
        v_appointment.ticket_id, 'em_execucao',
        'Técnico iniciou o atendimento no imóvel.'
      );
    elsif p_status = 'confirmado' then
      perform public.notify_ticket(
        v_appointment.ticket_id,
        array['empresa', 'prestador']::public.user_role[],
        'Inquilino Confirmou Presença',
        'O morador confirmou disponibilidade para o atendimento.',
        'success'
      );
    end if;
  end if;

  return v_appointment;
end;
$$;

-- ─── Conclusão, aceite e avaliação ──────────────────────────────────────────

create or replace function public.finalize_service(
  p_ticket_id uuid,
  p_services_performed text,
  p_materials_used text,
  p_warranty_months integer default 3,
  p_observations text default ''
)
returns public.service_completions
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_completion public.service_completions;
  v_ticket public.tickets;
begin
  insert into public.service_completions (
    ticket_id, services_performed, materials_used,
    warranty_months, observations, created_by
  )
  values (
    p_ticket_id, p_services_performed, p_materials_used,
    p_warranty_months, coalesce(p_observations, ''), auth.uid()
  )
  on conflict (ticket_id) do update set
    services_performed = excluded.services_performed,
    materials_used = excluded.materials_used,
    warranty_months = excluded.warranty_months,
    observations = excluded.observations,
    completed_at = now()
  returning * into v_completion;

  update public.tickets set status = 'concluido'
  where id = p_ticket_id
  returning * into v_ticket;

  -- Fecha o agendamento junto (CLAUDE.md §5, regra 7).
  update public.appointments
  set status = 'concluido'
  where ticket_id = p_ticket_id and status not in ('cancelado', 'nao_realizado');

  perform public.log_timeline(
    p_ticket_id, 'concluido', 'Conclusão do Serviço Registrada',
    format('Serviço finalizado: %s. Garantia: %s meses.', p_services_performed, p_warranty_months)
  );

  perform public.notify_ticket(
    p_ticket_id,
    array['inquilino', 'imobiliaria', 'empresa']::public.user_role[],
    'Serviço Concluído ' || v_ticket.protocol,
    'Por favor, confirme e avalie o atendimento.',
    'success'
  );

  return v_completion;
end;
$$;

-- Aceite do inquilino. NÃO muda o status (CLAUDE.md §5, regra 8).
create or replace function public.confirm_tenant_completion(p_ticket_id uuid)
returns public.service_completions
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_completion public.service_completions;
begin
  update public.service_completions
  set tenant_confirmed = true, tenant_confirmed_at = now()
  where ticket_id = p_ticket_id
  returning * into v_completion;

  if not found then
    raise exception 'Não há conclusão registrada para este chamado'
      using errcode = 'no_data_found';
  end if;

  perform public.log_timeline(
    p_ticket_id, 'concluido', 'Inquilino Confirmou a Realização',
    'O inquilino testou e atestou que o problema foi solucionado.'
  );

  perform public.notify_ticket(
    p_ticket_id,
    array['empresa', 'imobiliaria', 'prestador']::public.user_role[],
    'Serviço Atestado pelo Inquilino',
    'O morador confirmou que o problema foi resolvido.',
    'success'
  );

  return v_completion;
end;
$$;

-- Avaliação. Também não muda o status (regra 9).
create or replace function public.submit_evaluation(
  p_ticket_id uuid,
  p_rating integer,
  p_solved boolean default true,
  p_satisfactory boolean default true,
  p_punctual boolean default true,
  p_comments text default ''
)
returns public.evaluations
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_evaluation public.evaluations;
  v_ticket public.tickets;
begin
  select * into v_ticket from public.tickets where id = p_ticket_id;
  if not found then
    raise exception 'Chamado não encontrado ou sem permissão'
      using errcode = 'insufficient_privilege';
  end if;

  if v_ticket.status <> 'concluido' then
    raise exception 'Só é possível avaliar um chamado concluído'
      using errcode = 'check_violation';
  end if;

  insert into public.evaluations (
    ticket_id, rating, solved, satisfactory, punctual, comments, created_by
  )
  values (
    p_ticket_id, p_rating, p_solved, p_satisfactory, p_punctual,
    coalesce(p_comments, ''), auth.uid()
  )
  returning * into v_evaluation;

  perform public.log_timeline(
    p_ticket_id, 'concluido',
    format('Avaliação do Atendimento: %s Estrelas', p_rating),
    coalesce(nullif(p_comments, ''), 'Sem comentários adicionais')
  );

  perform public.notify_ticket(
    p_ticket_id,
    array['imobiliaria', 'empresa', 'prestador']::public.user_role[],
    format('Nova Avaliação Recebida (%s★)', p_rating),
    format('O chamado %s foi avaliado com nota %s/5.', v_ticket.protocol, p_rating),
    'success'
  );

  return v_evaluation;
end;
$$;

-- ─── Notificações ───────────────────────────────────────────────────────────

create or replace function public.mark_all_notifications_read()
returns integer
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_count integer;
begin
  update public.notifications
  set read_at = now()
  where recipient_profile_id = auth.uid() and read_at is null;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ─── Permissões ─────────────────────────────────────────────────────────────

revoke all on function public.log_timeline(uuid, public.ticket_status, text, text) from public, anon;
revoke all on function public.notify_ticket(uuid, public.user_role[], text, text, public.notification_type) from public, anon;

grant execute on function public.log_timeline(uuid, public.ticket_status, text, text) to authenticated;
grant execute on function public.notify_ticket(uuid, public.user_role[], text, text, public.notification_type) to authenticated;
grant execute on function public.ticket_status_label(public.ticket_status) to authenticated;
grant execute on function public.create_ticket(uuid, text, public.category, text, public.priority_level, public.preferred_period) to authenticated;
grant execute on function public.update_ticket_status(uuid, public.ticket_status, text) to authenticated;
grant execute on function public.assign_technician(uuid, uuid) to authenticated;
grant execute on function public.post_message(uuid, text) to authenticated;
grant execute on function public.save_technical_report(uuid, text, text, text, text, boolean, boolean, public.priority_level) to authenticated;
grant execute on function public.submit_quote(uuid, text, text, text, numeric, numeric, integer, text) to authenticated;
grant execute on function public.review_quote(uuid, boolean, text) to authenticated;
grant execute on function public.schedule_appointment(uuid, timestamptz, timestamptz, uuid, text, text) to authenticated;
grant execute on function public.update_appointment_status(uuid, public.appointment_status) to authenticated;
grant execute on function public.finalize_service(uuid, text, text, integer, text) to authenticated;
grant execute on function public.confirm_tenant_completion(uuid) to authenticated;
grant execute on function public.submit_evaluation(uuid, integer, boolean, boolean, boolean, text) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;
