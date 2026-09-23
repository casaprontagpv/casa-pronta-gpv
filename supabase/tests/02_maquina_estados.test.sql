-- ════════════════════════════════════════════════════════════════════════════
-- Máquina de estados do chamado (CLAUDE.md §5)
--
-- O protótipo escondia as ações na interface conforme o status, mas
-- `updateTicketStatus` aceitava qualquer destino. Aqui a ordem é garantida
-- pelo banco, e estes testes provam que a garantia existe.
-- ════════════════════════════════════════════════════════════════════════════

begin;
select plan(18);

\ir _helpers.psql

-- ─── Transições permitidas ──────────────────────────────────────────────────

select tests.authenticate_as(tests.alianca());

select lives_ok(
  $$ select public.update_ticket_status('d0000000-0000-0000-0000-000000000003', 'em_analise') $$,
  'imobiliária pode mover chamado_aberto → em_analise'
);

select tests.authenticate_as(tests.central());

select lives_ok(
  $$ select public.update_ticket_status('d0000000-0000-0000-0000-000000000003', 'aguardando_vistoria') $$,
  'empresa pode mover em_analise → aguardando_vistoria'
);

select lives_ok(
  $$ select public.update_ticket_status('d0000000-0000-0000-0000-000000000003', 'orcamento_enviado') $$,
  'empresa pode mover aguardando_vistoria → orcamento_enviado'
);

-- ─── Transições recusadas ───────────────────────────────────────────────────

select throws_ok(
  $$ select public.update_ticket_status('d0000000-0000-0000-0000-000000000003', 'concluido') $$,
  null,
  'NÃO se pula de orcamento_enviado direto para concluido'
);

select tests.clear_authentication();
update public.tickets set status = 'chamado_aberto'
where id = 'd0000000-0000-0000-0000-000000000003';

select tests.authenticate_as(tests.central());

select throws_ok(
  $$ select public.update_ticket_status('d0000000-0000-0000-0000-000000000003', 'concluido') $$,
  null,
  'NÃO se conclui um chamado recém-aberto'
);

select throws_ok(
  $$ select public.update_ticket_status('d0000000-0000-0000-0000-000000000003', 'em_execucao') $$,
  null,
  'NÃO se inicia execução sem agendamento'
);

-- ─── Autorização por papel ──────────────────────────────────────────────────

select tests.authenticate_as(tests.mariana());

select throws_ok(
  $$ select public.update_ticket_status('d0000000-0000-0000-0000-000000000001', 'concluido') $$,
  null,
  'inquilino NÃO conclui o próprio chamado — quem atesta é o técnico'
);

-- Só a imobiliária e a empresa aprovam orçamento (CLAUDE.md §8).
select tests.authenticate_as(tests.carlos());

select throws_ok(
  $$ select public.update_ticket_status('d0000000-0000-0000-0000-000000000001', 'cancelado') $$,
  null,
  'técnico NÃO cancela chamado'
);

-- ─── Estados terminais ──────────────────────────────────────────────────────

select tests.clear_authentication();
update public.tickets set status = 'concluido'
where id = 'd0000000-0000-0000-0000-000000000003';

select tests.authenticate_as(tests.central());

select throws_ok(
  $$ select public.update_ticket_status('d0000000-0000-0000-0000-000000000003', 'em_execucao') $$,
  null,
  'concluido é terminal: não há transição saindo dele'
);

-- ─── Timeline append-only ───────────────────────────────────────────────────

-- Sem política de UPDATE/DELETE, a RLS não lança exceção: ela simplesmente não
-- encontra linha para afetar. A garantia que importa é que o conteúdo não muda.
select tests.authenticate_as(tests.mariana());

update public.ticket_timeline set title = 'Adulterado'
where ticket_id = 'd0000000-0000-0000-0000-000000000001';

select is(
  (select count(*) from public.ticket_timeline
   where ticket_id = 'd0000000-0000-0000-0000-000000000001' and title = 'Adulterado'),
  0::bigint,
  'timeline não aceita UPDATE — nem pelo autor do evento'
);

select tests.authenticate_as(tests.central());

delete from public.ticket_timeline
where ticket_id = 'd0000000-0000-0000-0000-000000000001';

select is(
  (select count(*) from public.ticket_timeline where ticket_id = 'd0000000-0000-0000-0000-000000000001'),
  4::bigint,
  'timeline não aceita DELETE — nem pela central; os 4 eventos continuam lá'
);

-- ─── Orçamento ──────────────────────────────────────────────────────────────

select tests.authenticate_as(tests.alianca());

select throws_ok(
  $$ select public.review_quote(
       (select id from public.quotes where ticket_id = 'd0000000-0000-0000-0000-000000000002'),
       false, '') $$,
  null,
  'reprovar orçamento SEM motivo é recusado'
);

select lives_ok(
  $$ select public.review_quote(
       (select id from public.quotes where ticket_id = 'd0000000-0000-0000-0000-000000000002'),
       false, 'Valor acima do teto contratual') $$,
  'reprovar COM motivo funciona'
);

select is(
  (select rejection_reason from public.quotes where ticket_id = 'd0000000-0000-0000-0000-000000000002'),
  'Valor acima do teto contratual',
  'o motivo da reprovação fica registrado'
);

select is(
  (select status from public.tickets where id = 'd0000000-0000-0000-0000-000000000002')::text,
  'orcamento_reprovado',
  'reprovar o orçamento move o chamado para orcamento_reprovado'
);

select throws_ok(
  $$ select public.review_quote(
       (select id from public.quotes where ticket_id = 'd0000000-0000-0000-0000-000000000002'),
       true, null) $$,
  null,
  'orçamento já decidido não pode ser revisado de novo'
);

-- Nova versão preserva a anterior — inclusive a reprovada e seu motivo.
select tests.authenticate_as(tests.central());

select lives_ok(
  $$ select public.submit_quote(
       'd0000000-0000-0000-0000-000000000002',
       'Nova proposta revisada', '1x resistência', 'Mão de obra',
       120.00, 180.00, 1) $$,
  'a prestadora pode enviar uma versão revisada do orçamento'
);

select is(
  (select count(*) from public.quotes where ticket_id = 'd0000000-0000-0000-0000-000000000002'),
  2::bigint,
  'as duas versões do orçamento coexistem — a reprovada não é sobrescrita'
);

select * from finish();
rollback;
