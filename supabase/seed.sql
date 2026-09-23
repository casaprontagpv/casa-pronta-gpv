-- ════════════════════════════════════════════════════════════════════════════
-- Seed de demonstração — APENAS desenvolvimento e homologação
--
-- ⚠️ NUNCA rodar no projeto de produção. Cria usuários com senha conhecida.
-- O Supabase CLI aplica este arquivo automaticamente em `supabase start` e
-- `supabase db reset`; ele NÃO é enviado por `supabase db push`.
--
-- Espelha src/mockData.ts e src/mockUsers.ts, agora com chaves estrangeiras
-- reais no lugar do casamento por string.
-- ════════════════════════════════════════════════════════════════════════════

-- Ids fixos para que os testes pgTAP possam referenciá-los.
-- Usuários (auth.users)
--   11111111-… inquilinos   22222222-… imobiliárias
--   33333333-… empresa      44444444-… técnicos

-- ─── Usuários do Auth ───────────────────────────────────────────────────────
-- Senha de todos: "senha123". O trigger on_auth_user_created cria o profile.

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'mariana.costa@email.com',
   crypt('senha123', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"name":"Mariana Costa","role":"inquilino","phone":"(11) 98123-4567"}'),

  ('11111111-1111-1111-1111-111111111112', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'roberto.nunes@email.com',
   crypt('senha123', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"name":"Roberto Nunes","role":"inquilino","phone":"(11) 97234-8899"}'),

  ('11111111-1111-1111-1111-111111111113', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'camila.toledo@email.com',
   crypt('senha123', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"name":"Camila Toledo","role":"inquilino","phone":"(11) 98999-1122"}'),

  -- Vizinho de andar da Mariana. Existe no seed exatamente para o teste de
  -- isolamento: foi este caso que o filtro por includes() vazava.
  ('11111111-1111-1111-1111-111111111114', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'andre.siqueira@email.com',
   crypt('senha123', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"name":"André Siqueira","role":"inquilino","phone":"(11) 96543-2211"}'),

  ('22222222-2222-2222-2222-222222222221', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'gestao@aliancaimoveis.com.br',
   crypt('senha123', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"name":"Aliança Gestão Imobiliária","role":"imobiliaria","phone":"(11) 3987-6543"}'),

  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'contato@solarimoveis.com.br',
   crypt('senha123', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"name":"Solar Negócios Imobiliários","role":"imobiliaria","phone":"(11) 3456-7890"}'),

  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'admin@casapronta.com.br',
   crypt('senha123', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"name":"Casa Pronta Manutenções (Central)","role":"empresa","phone":"(11) 4004-9988"}'),

  ('44444444-4444-4444-4444-444444444441', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'carlos.santos@casapronta.com.br',
   crypt('senha123', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"name":"Carlos Santos","role":"prestador","phone":"(11) 98765-4321"}'),

  ('44444444-4444-4444-4444-444444444442', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'jose.lima@casapronta.com.br',
   crypt('senha123', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"name":"José Lima","role":"prestador","phone":"(11) 99123-4567"}'),

  -- Outro técnico chamado Carlos. Está aqui de propósito: o protótipo tinha um
  -- fallback literal includes('carlos') que entregava a agenda alheia a ele.
  ('44444444-4444-4444-4444-444444444443', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'carlos.eduardo@casapronta.com.br',
   crypt('senha123', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"name":"Carlos Eduardo","role":"prestador","phone":"(11) 97777-1234"}')
on conflict (id) do nothing;

-- Identidades (necessárias para login por e-mail/senha no GoTrue).
insert into auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
select
  gen_random_uuid(), u.id, u.id::text,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email', now(), now(), now()
from auth.users u
where u.email like '%@email.com' or u.email like '%casapronta.com.br'
   or u.email like '%aliancaimoveis.com.br' or u.email like '%solarimoveis.com.br'
on conflict do nothing;

-- ─── Imobiliárias ───────────────────────────────────────────────────────────

insert into public.agencies (id, name, cnpj, phone, email) values
  ('a0000000-0000-0000-0000-000000000001', 'Aliança Gestão Imobiliária',
   '98.765.432/0001-55', '(11) 3987-6543', 'gestao@aliancaimoveis.com.br'),
  ('a0000000-0000-0000-0000-000000000002', 'Solar Negócios Imobiliários',
   '45.123.789/0001-12', '(11) 3456-7890', 'contato@solarimoveis.com.br')
on conflict (id) do nothing;

insert into public.agency_members (agency_id, profile_id) values
  ('a0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222221'),
  ('a0000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222')
on conflict do nothing;

-- ─── Imóveis ────────────────────────────────────────────────────────────────

insert into public.properties (id, agency_id, code, address, unit, neighborhood, property_type) values
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   'IMOV-402', 'Rua das Acácias, 450', 'Apto 402', 'Pinheiros', 'apartamento'),
  -- Mesmo prédio, outro andar: o par que o filtro antigo confundia.
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
   'IMOV-201', 'Rua das Acácias, 450', 'Apto 201', 'Pinheiros', 'apartamento'),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001',
   'IMOV-084', 'Av. Paulista, 1200', 'Apto 84', 'Bela Vista', 'apartamento'),
  -- Imóvel da OUTRA imobiliária: base do teste de isolamento entre carteiras.
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002',
   'IMOV-003', 'Rua Oscar Freire, 89', 'Casa 3', 'Jardins', 'casa')
on conflict (id) do nothing;

insert into public.property_tenants (property_id, profile_id) values
  ('b0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111'),
  ('b0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111114'),
  ('b0000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111112'),
  ('b0000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111113')
on conflict do nothing;

-- ─── Equipe de campo ────────────────────────────────────────────────────────

insert into public.technicians (id, profile_id, name, team, specialties, phone, email, status, rating) values
  ('c0000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444441',
   'Carlos Santos', 'Equipe Hidráulica',
   array['Hidráulica', 'Vazamentos', 'Tubulações'],
   '(11) 98765-4321', 'carlos.santos@casapronta.com.br', 'em_atendimento', 4.9),
  ('c0000000-0000-0000-0000-000000000002', '44444444-4444-4444-4444-444444444442',
   'José Lima', 'Equipe Elétrica',
   array['Elétrica', 'Disjuntores', 'Chuveiros'],
   '(11) 99123-4567', 'jose.lima@casapronta.com.br', 'disponivel', 5.0),
  ('c0000000-0000-0000-0000-000000000003', '44444444-4444-4444-4444-444444444443',
   'Carlos Eduardo', 'Equipe Revestimentos',
   array['Azulejos', 'Porcelanato', 'Rejunte'],
   '(11) 97777-1234', 'carlos.eduardo@casapronta.com.br', 'disponivel', 4.7)
on conflict (id) do nothing;

-- ─── Chamados ───────────────────────────────────────────────────────────────
-- Inseridos direto (sem RPC) porque o seed roda sem sessão autenticada.
-- O trigger da máquina de estados libera quando auth_role() é nulo.

insert into public.tickets (
  id, protocol, property_id, agency_id, tenant_profile_id, created_by,
  environment, category, description, urgency, preferred_period,
  status, assigned_technician_id
) values
  ('d0000000-0000-0000-0000-000000000001', '#1030',
   'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
   'Cozinha', 'hidraulica',
   'Vazamento constante sob a pia da cozinha. A água acumula no armário.',
   'alta', 'manha', 'em_execucao', 'c0000000-0000-0000-0000-000000000001'),

  ('d0000000-0000-0000-0000-000000000002', '#1031',
   'b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001',
   '11111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111112',
   'Banheiro social', 'eletrica',
   'Chuveiro elétrico parou de esquentar e o disjuntor desarma.',
   'emergencial', 'integral', 'orcamento_enviado', 'c0000000-0000-0000-0000-000000000002'),

  -- Chamado do vizinho de andar da Mariana.
  ('d0000000-0000-0000-0000-000000000003', '#1032',
   'b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
   '11111111-1111-1111-1111-111111111114', '11111111-1111-1111-1111-111111111114',
   'Sala', 'infiltracao',
   'Mancha de umidade crescendo na parede que dá para a área externa.',
   'normal', 'tarde', 'chamado_aberto', null),

  -- Chamado da OUTRA imobiliária.
  ('d0000000-0000-0000-0000-000000000004', '#1033',
   'b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002',
   '11111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111113',
   'Quarto', 'pintura',
   'Pintura descascando no teto após a última chuva.',
   'baixa', 'sabado', 'em_analise', null)
on conflict (id) do nothing;

-- Mantém a sequência à frente dos protocolos inseridos à mão.
select setval('public.ticket_protocol_seq', 1033, true);

-- ─── Timeline ───────────────────────────────────────────────────────────────

insert into public.ticket_timeline (ticket_id, status, title, description, author_profile_id, author_name, author_role) values
  ('d0000000-0000-0000-0000-000000000001', 'chamado_aberto', 'Chamado Aberto',
   'Chamado registrado. Aguardando análise da imobiliária.',
   '11111111-1111-1111-1111-111111111111', 'Mariana Costa', 'inquilino'),
  ('d0000000-0000-0000-0000-000000000001', 'em_analise', 'Em Análise pela Imobiliária',
   'Vistoria técnica autorizada.',
   '22222222-2222-2222-2222-222222222221', 'Aliança Gestão Imobiliária', 'imobiliaria'),
  ('d0000000-0000-0000-0000-000000000001', 'servico_agendado', 'Serviço Agendado',
   'Atendimento agendado com o técnico Carlos Santos.',
   '33333333-3333-3333-3333-333333333333', 'Casa Pronta Manutenções (Central)', 'empresa'),
  ('d0000000-0000-0000-0000-000000000001', 'em_execucao', 'Serviço em Execução',
   'Técnico no local executando o reparo.',
   '44444444-4444-4444-4444-444444444441', 'Carlos Santos', 'prestador'),

  ('d0000000-0000-0000-0000-000000000002', 'chamado_aberto', 'Chamado Aberto',
   'Chamado registrado com prioridade emergencial.',
   '11111111-1111-1111-1111-111111111112', 'Roberto Nunes', 'inquilino'),
  ('d0000000-0000-0000-0000-000000000002', 'orcamento_enviado', 'Orçamento Enviado para Aprovação',
   'Orçamento disponibilizado para avaliação da imobiliária.',
   '33333333-3333-3333-3333-333333333333', 'Casa Pronta Manutenções (Central)', 'empresa'),

  ('d0000000-0000-0000-0000-000000000003', 'chamado_aberto', 'Chamado Aberto',
   'Chamado registrado. Aguardando análise da imobiliária.',
   '11111111-1111-1111-1111-111111111114', 'André Siqueira', 'inquilino'),

  ('d0000000-0000-0000-0000-000000000004', 'chamado_aberto', 'Chamado Aberto',
   'Chamado registrado. Aguardando análise da imobiliária.',
   '11111111-1111-1111-1111-111111111113', 'Camila Toledo', 'inquilino');

-- ─── Chat ───────────────────────────────────────────────────────────────────

insert into public.ticket_messages (ticket_id, sender_profile_id, sender_name, sender_role, body) values
  ('d0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'Mariana Costa', 'inquilino',
   'Olá! O vazamento piorou desde ontem, já está molhando o piso.'),
  ('d0000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444441',
   'Carlos Santos', 'prestador',
   'Bom dia! Estou a caminho, chego em cerca de 30 minutos.');

-- ─── Parecer técnico e orçamento ────────────────────────────────────────────

insert into public.technical_reports (
  ticket_id, technician_id, technician_name, tenant_problem,
  situation_found, possible_cause, recommended_solution, required_materials,
  needs_quote, needs_return, recommended_priority
) values (
  'd0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 'José Lima',
  'Chuveiro elétrico parou de esquentar e o disjuntor desarma.',
  'Resistência do chuveiro em curto e disjuntor subdimensionado para a carga.',
  'Resistência queimada por excesso de corrente.',
  'Substituir a resistência e trocar o disjuntor por um de 40A.',
  '1x resistência 7500W, 1x disjuntor 40A',
  true, false, 'emergencial'
);

insert into public.quotes (
  ticket_id, version, service_description, materials_summary, labor_summary,
  materials_cost, labor_cost, execution_deadline_days, status
) values (
  'd0000000-0000-0000-0000-000000000002', 1,
  'Substituição de resistência do chuveiro e troca de disjuntor.',
  '1x resistência 7500W, 1x disjuntor 40A',
  'Mão de obra elétrica especializada.',
  180.00, 220.00, 1, 'enviado'
);

-- ─── Agendamento ────────────────────────────────────────────────────────────

insert into public.appointments (
  ticket_id, technician_id, starts_at, ends_at, service_type, status, tenant_confirmed
) values (
  'd0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
  date_trunc('day', now()) + interval '9 hours',
  date_trunc('day', now()) + interval '11 hours',
  'Reparo hidráulico - Cozinha', 'em_atendimento', true
);
