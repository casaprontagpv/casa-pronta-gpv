-- ════════════════════════════════════════════════════════════════════════════
-- Isolamento de dados — uma asserção por regra do CLAUDE.md §6
--
-- Esta é a suíte que justifica a Etapa 2. RLS mal escrita vazando dados entre
-- imobiliárias é o pior cenário do produto, e é o único risco que merece teste
-- dedicado rodando no CI antes de qualquer deploy.
-- ════════════════════════════════════════════════════════════════════════════

begin;
select plan(27);

-- `\ir` resolve relativo a ESTE arquivo; `\i` usaria o cwd do container.
\ir _helpers.psql

-- ─── INQUILINO ──────────────────────────────────────────────────────────────

select tests.authenticate_as(tests.mariana());

select is(
  (select count(*) from public.tickets where id = tests.ticket_mariana()),
  1::bigint,
  'inquilino enxerga o chamado do próprio imóvel'
);

-- A regressão central: Apto 402 e Apto 201 no MESMO prédio. O filtro antigo
-- comparava endereço com includes() bidirecional e entregava um pelo outro.
select is(
  (select count(*) from public.tickets where id = tests.ticket_andre()),
  0::bigint,
  'inquilino NÃO enxerga o chamado do vizinho de andar (mesmo prédio, outra unidade)'
);

select is(
  (select count(*) from public.tickets where id = tests.ticket_roberto()),
  0::bigint,
  'inquilino NÃO enxerga chamado de outro imóvel da mesma imobiliária'
);

select is(
  (select count(*) from public.tickets),
  1::bigint,
  'inquilino enxerga exatamente 1 chamado — o seu'
);

select is(
  (select count(*) from public.ticket_timeline where ticket_id = tests.ticket_roberto()),
  0::bigint,
  'a timeline de outro chamado é invisível ao inquilino'
);

select is(
  (select count(*) from public.ticket_messages where ticket_id = tests.ticket_roberto()),
  0::bigint,
  'o chat de outro chamado é invisível ao inquilino'
);

select is(
  (select count(*) from public.quotes),
  0::bigint,
  'inquilino não enxerga orçamento de chamado alheio'
);

-- Faturamento e margens são da prestadora (CLAUDE.md §6).
select is(
  (select count(*) from public.technicians),
  1::bigint,
  'inquilino enxerga apenas o técnico designado ao seu chamado, não a equipe'
);

-- ─── IMOBILIÁRIA ────────────────────────────────────────────────────────────

select tests.authenticate_as(tests.alianca());

select is(
  (select count(*) from public.tickets),
  3::bigint,
  'imobiliária enxerga os 3 chamados da própria carteira'
);

select is(
  (select count(*) from public.tickets where id = tests.ticket_camila_solar()),
  0::bigint,
  'imobiliária NÃO enxerga chamado de outra imobiliária'
);

select is(
  (select count(*) from public.properties where agency_id <> 'a0000000-0000-0000-0000-000000000001'),
  0::bigint,
  'imobiliária não enxerga imóveis de outra carteira'
);

select tests.authenticate_as(tests.solar());

select is(
  (select count(*) from public.tickets),
  1::bigint,
  'a outra imobiliária enxerga somente o próprio chamado'
);

select is(
  (select count(*) from public.tickets where id = tests.ticket_mariana()),
  0::bigint,
  'o isolamento entre carteiras vale nos dois sentidos'
);

-- ─── PRESTADOR ──────────────────────────────────────────────────────────────

select tests.authenticate_as(tests.carlos());

select is(
  (select count(*) from public.tickets),
  1::bigint,
  'técnico enxerga somente os chamados atribuídos a ele'
);

select is(
  (select count(*) from public.tickets where id = tests.ticket_mariana()),
  1::bigint,
  'técnico enxerga o chamado que lhe foi designado'
);

-- Regressão: havia um fallback literal includes('carlos') no filtro do técnico.
select tests.authenticate_as(tests.carlos_eduardo());

select is(
  (select count(*) from public.tickets),
  0::bigint,
  'outro técnico chamado Carlos NÃO herda a agenda do Carlos Santos'
);

select tests.authenticate_as(tests.jose());

select is(
  (select count(*) from public.tickets where id = tests.ticket_mariana()),
  0::bigint,
  'técnico não enxerga chamado de outro técnico'
);

select is(
  (select count(*) from public.tickets where id = tests.ticket_roberto()),
  1::bigint,
  'técnico enxerga o chamado em que é o designado'
);

-- ─── EMPRESA ────────────────────────────────────────────────────────────────

select tests.authenticate_as(tests.central());

select is(
  (select count(*) from public.tickets),
  4::bigint,
  'a central da prestadora enxerga todos os chamados'
);

select is(
  (select count(*) from public.technicians),
  3::bigint,
  'a central enxerga a equipe inteira'
);

select is(
  (select count(*) from public.agencies),
  2::bigint,
  'a central enxerga todas as imobiliárias'
);

-- ─── NOTIFICAÇÕES: estritamente pessoais ────────────────────────────────────

select tests.clear_authentication();

insert into public.notifications (recipient_profile_id, ticket_id, title, body)
values (tests.mariana(), tests.ticket_mariana(), 'Teste', 'Notificação da Mariana');

select tests.authenticate_as(tests.roberto());
select is(
  (select count(*) from public.notifications),
  0::bigint,
  'um usuário não lê a caixa de notificações de outro'
);

select tests.authenticate_as(tests.central());
select is(
  (select count(*) from public.notifications),
  0::bigint,
  'nem a central lê a caixa dos outros — "lido" é estado pessoal'
);

select tests.authenticate_as(tests.mariana());
select is(
  (select count(*) from public.notifications),
  1::bigint,
  'cada um lê a própria caixa'
);

-- ─── ESCALONAMENTO DE PRIVILÉGIO ────────────────────────────────────────────

select tests.authenticate_as(tests.mariana());

select throws_ok(
  $$ update public.profiles set role = 'empresa' where id = '11111111-1111-1111-1111-111111111111' $$,
  null,
  'inquilino NÃO consegue promover o próprio papel para empresa'
);

-- Sem sessão, nada é visível.
select tests.clear_authentication();
select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims', null, true);

select is(
  (select count(*) from public.tickets),
  0::bigint,
  'sem sessão autenticada não há nenhum chamado visível'
);

select tests.clear_authentication();
select is(
  (select count(*) from public.tickets),
  4::bigint,
  'o papel postgres (service_role / migrations) continua com acesso total'
);

select * from finish();
rollback;
