-- ════════════════════════════════════════════════════════════════════════════
-- Conflito de agenda (CLAUDE.md §7)
--
-- A regra deixou de ser um `.find()` em JavaScript e virou constraint EXCLUDE.
-- Estes testes são o espelho de src/domain/scheduling.test.ts: os dois lados
-- precisam concordar, senão a interface promete algo que o banco recusa.
-- ════════════════════════════════════════════════════════════════════════════

begin;
select plan(12);

\ir _helpers.psql

select tests.clear_authentication();

-- Limpa a agenda do seed para partir de um estado conhecido.
delete from public.appointments;

-- Base: Carlos das 09:00 às 11:00 de um dia futuro qualquer.
insert into public.appointments (technician_id, starts_at, ends_at, service_type)
values (
  tests.tech_carlos(),
  '2099-01-15 09:00:00-03'::timestamptz,
  '2099-01-15 11:00:00-03'::timestamptz,
  'Base'
);

-- ─── Sobreposição recusada ──────────────────────────────────────────────────

select throws_ok(
  $$ insert into public.appointments (technician_id, starts_at, ends_at, service_type)
     values ('c0000000-0000-0000-0000-000000000001',
             '2099-01-15 10:00:00-03', '2099-01-15 12:00:00-03', 'Sobreposto') $$,
  '23P01',
  null,
  'sobreposição parcial no mesmo técnico é recusada pelo banco'
);

select throws_ok(
  $$ insert into public.appointments (technician_id, starts_at, ends_at, service_type)
     values ('c0000000-0000-0000-0000-000000000001',
             '2099-01-15 09:30:00-03', '2099-01-15 10:00:00-03', 'Contido') $$,
  '23P01',
  null,
  'janela contida em outra é recusada'
);

select throws_ok(
  $$ insert into public.appointments (technician_id, starts_at, ends_at, service_type)
     values ('c0000000-0000-0000-0000-000000000001',
             '2099-01-15 08:00:00-03', '2099-01-15 14:00:00-03', 'Envolve') $$,
  '23P01',
  null,
  'janela que engloba a existente é recusada'
);

-- ─── Casos permitidos ───────────────────────────────────────────────────────

select lives_ok(
  $$ insert into public.appointments (technician_id, starts_at, ends_at, service_type)
     values ('c0000000-0000-0000-0000-000000000001',
             '2099-01-15 11:00:00-03', '2099-01-15 13:00:00-03', 'Encostado depois') $$,
  'encostar NÃO é sobrepor: 09–11 e 11–13 convivem'
);

select lives_ok(
  $$ insert into public.appointments (technician_id, starts_at, ends_at, service_type)
     values ('c0000000-0000-0000-0000-000000000001',
             '2099-01-15 07:00:00-03', '2099-01-15 09:00:00-03', 'Encostado antes') $$,
  'encostar antes também convive'
);

select lives_ok(
  $$ insert into public.appointments (technician_id, starts_at, ends_at, service_type)
     values ('c0000000-0000-0000-0000-000000000002',
             '2099-01-15 09:00:00-03', '2099-01-15 11:00:00-03', 'Outro técnico') $$,
  'OUTRO técnico pode atender no mesmo horário'
);

select lives_ok(
  $$ insert into public.appointments (technician_id, starts_at, ends_at, service_type)
     values ('c0000000-0000-0000-0000-000000000001',
             '2099-01-16 09:00:00-03', '2099-01-16 11:00:00-03', 'Outro dia') $$,
  'mesmo técnico pode atender no mesmo horário em OUTRO dia'
);

-- ─── Status que liberam a janela ────────────────────────────────────────────

select tests.clear_authentication();
update public.appointments set status = 'cancelado'
where service_type = 'Base';

select lives_ok(
  $$ insert into public.appointments (technician_id, starts_at, ends_at, service_type)
     values ('c0000000-0000-0000-0000-000000000001',
             '2099-01-15 09:00:00-03', '2099-01-15 11:00:00-03', 'Reocupa cancelado') $$,
  'agendamento CANCELADO libera a janela'
);

update public.appointments set status = 'nao_realizado'
where service_type = 'Reocupa cancelado';

select lives_ok(
  $$ insert into public.appointments (technician_id, starts_at, ends_at, service_type)
     values ('c0000000-0000-0000-0000-000000000001',
             '2099-01-15 09:30:00-03', '2099-01-15 10:30:00-03', 'Reocupa nao_realizado') $$,
  'agendamento NÃO REALIZADO também libera a janela'
);

-- ─── Integridade da janela ──────────────────────────────────────────────────

select throws_ok(
  $$ insert into public.appointments (technician_id, starts_at, ends_at, service_type)
     values ('c0000000-0000-0000-0000-000000000002',
             '2099-02-01 14:00:00-03', '2099-02-01 13:00:00-03', 'Invertido') $$,
  '23514',
  null,
  'término anterior ao início é recusado'
);

-- ─── Pela RPC, com mensagem legível ─────────────────────────────────────────

select tests.authenticate_as(tests.central());

select lives_ok(
  $$ select public.schedule_appointment(
       'c0000000-0000-0000-0000-000000000002',
       '2099-03-01 09:00:00-03', '2099-03-01 11:00:00-03') $$,
  'schedule_appointment cria o agendamento quando a janela está livre'
);

select throws_ok(
  $$ select public.schedule_appointment(
       'c0000000-0000-0000-0000-000000000002',
       '2099-03-01 10:00:00-03', '2099-03-01 12:00:00-03') $$,
  '23P01',
  null,
  'schedule_appointment traduz o conflito em erro para a interface'
);

select * from finish();
rollback;
