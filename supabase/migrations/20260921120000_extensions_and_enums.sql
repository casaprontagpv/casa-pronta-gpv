-- ════════════════════════════════════════════════════════════════════════════
-- Extensões e tipos de domínio
--
-- Os enums espelham 1:1 os union types de src/types.ts. Ao adicionar um valor
-- aqui, atualize também types.ts e utils/helpers.ts (CLAUDE.md §13).
-- ════════════════════════════════════════════════════════════════════════════

-- btree_gist permite combinar `=` (technician_id) com `&&` (intervalo de tempo)
-- numa mesma constraint EXCLUDE. É o que torna impossível agendar sobreposição.
create extension if not exists btree_gist;

-- ─── Papéis e estados ───────────────────────────────────────────────────────

create type public.user_role as enum (
  'inquilino',
  'imobiliaria',
  'empresa',
  'prestador'
);

create type public.ticket_status as enum (
  'chamado_aberto',
  'em_analise',
  'aguardando_vistoria',
  'orcamento_enviado',
  'aguardando_aprovacao',
  'orcamento_aprovado',
  'orcamento_reprovado',
  'servico_agendado',
  'em_execucao',
  'pendente',
  'concluido',
  'cancelado'
);

create type public.appointment_status as enum (
  'agendado',
  'confirmado',
  'aguardando_confirmacao',
  'em_deslocamento',
  'em_atendimento',
  'concluido',
  'reagendar',
  'cancelado',
  'nao_realizado'
);

create type public.quote_status as enum (
  'enviado',
  'aprovado',
  'reprovado'
);

create type public.technician_status as enum (
  'disponivel',
  'em_atendimento',
  'folga'
);

-- ─── Classificações ─────────────────────────────────────────────────────────

create type public.priority_level as enum (
  'emergencial',
  'alta',
  'normal',
  'baixa'
);

create type public.category as enum (
  'eletrica',
  'hidraulica',
  'pintura',
  'infiltracao',
  'porta_fechadura',
  'janela',
  'revestimento_piso',
  'telhado',
  'outro'
);

create type public.property_type as enum (
  'apartamento',
  'casa',
  'sobrado',
  'comercial',
  'outro'
);

create type public.preferred_period as enum (
  'manha',
  'tarde',
  'integral',
  'sabado'
);

create type public.notification_type as enum (
  'info',
  'success',
  'warning',
  'urgent'
);

-- Origem de cada anexo, para saber em que etapa do chamado a foto foi tirada.
create type public.attachment_kind as enum (
  'chamado',
  'parecer',
  'orcamento',
  'antes',
  'depois'
);

-- ─── Protocolo do chamado ───────────────────────────────────────────────────
-- O protótipo calculava `1030 + tickets.length`, que repetia após qualquer
-- remoção ou reset. Uma sequência do banco é monotônica e livre de corrida.
create sequence public.ticket_protocol_seq start with 1030 increment by 1;
