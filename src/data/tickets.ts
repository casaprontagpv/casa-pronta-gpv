import { supabase } from '../lib/supabase';
import type {
  Appointment,
  MaintenanceTicket,
  NotificationItem,
  Technician,
  TicketStatus,
} from '../types';
import {
  paraAgendamento,
  paraChamado,
  paraNotificacao,
  paraTecnico,
  type LinhaAgendamento,
  type LinhaChamado,
  type LinhaNotificacao,
  type LinhaTecnico,
} from './mappers';
import { paraInstante } from './datetime';

/**
 * Acesso aos chamados.
 *
 * Nenhuma consulta aqui filtra por usuário: quem filtra é a RLS. O que chega já
 * é o que a pessoa pode ver. Isso é diferente do protótipo, onde o filtro era
 * client-side e contornável pelo DevTools.
 */

export class DataError extends Error {}

const erro = (mensagem: string): never => {
  throw new DataError(traduzir(mensagem));
};

const traduzir = (mensagem: string): string => {
  const m = mensagem.toLowerCase();
  if (m.includes('transição de status não permitida')) {
    // O trigger da máquina de estados devolve a mensagem já legível.
    return mensagem.replace(/^.*?Transição/i, 'Transição');
  }
  if (m.includes('já possui outro atendimento neste horário')) return mensagem;
  if (m.includes('exclusion_violation') || m.includes('no_overlap')) {
    return 'Este técnico já tem outro atendimento no horário escolhido.';
  }
  if (m.includes('violates row-level security') || m.includes('insufficient_privilege')) {
    return 'Você não tem permissão para esta ação.';
  }
  if (m.includes('justificativa da reprovação')) return 'Informe a justificativa da reprovação.';
  if (m.includes('já foi aprovado') || m.includes('já foi reprovado')) {
    return 'Este orçamento já foi decidido.';
  }
  if (m.includes('chamado concluído')) return 'Só é possível avaliar um chamado concluído.';
  return mensagem;
};

// Campos embutidos que a LISTA precisa. Timeline e chat ficam de fora: são
// grandes e só aparecem no detalhe.
const CAMPOS_LISTA = `
  *,
  properties(id, code, address, unit, neighborhood, property_type, agencies(id, name)),
  profiles:tenant_profile_id(id, name, email, phone),
  technicians:assigned_technician_id(id, name, team, specialties, phone, email, avatar_url, status, rating, active),
  quotes(*),
  appointments(id, ticket_id, technician_id, starts_at, ends_at, service_type, notes, status, tenant_confirmed),
  technical_reports(*),
  service_completions(*),
  evaluations(*)
`;

const CAMPOS_DETALHE = `
  ${CAMPOS_LISTA},
  ticket_timeline(*),
  ticket_messages(*)
`;

export const listarChamados = async (): Promise<MaintenanceTicket[]> => {
  const { data, error } = await supabase
    .from('tickets')
    .select(CAMPOS_LISTA)
    .order('created_at', { ascending: false });

  if (error) erro(error.message);
  return (data as unknown as LinhaChamado[]).map(paraChamado);
};

export const buscarChamado = async (id: string): Promise<MaintenanceTicket | null> => {
  const { data, error } = await supabase
    .from('tickets')
    .select(CAMPOS_DETALHE)
    .eq('id', id)
    .maybeSingle();

  if (error) erro(error.message);
  if (!data) return null;

  const chamado = paraChamado(data as unknown as LinhaChamado);
  // A ordem cronológica é do banco, mas o PostgREST não garante ordem em
  // recurso embutido — a timeline append-only precisa sair em ordem.
  chamado.timeline.sort((a, b) => a.id.localeCompare(b.id));
  return chamado;
};

export const listarTecnicos = async (): Promise<Technician[]> => {
  const { data, error } = await supabase
    .from('technicians')
    .select('*')
    .eq('active', true)
    .order('name');

  if (error) erro(error.message);
  return (data as unknown as LinhaTecnico[]).map(paraTecnico);
};

export const listarAgendamentos = async (): Promise<Appointment[]> => {
  const { data, error } = await supabase
    .from('appointments')
    .select(
      `*,
       technicians(id, name, team, specialties, phone, email, avatar_url, status, rating, active),
       tickets(protocol, description, urgency,
         properties(id, code, address, unit, neighborhood, property_type, agencies(id, name)),
         profiles:tenant_profile_id(id, name, email, phone))`
    )
    .order('starts_at');

  if (error) erro(error.message);
  return (data as unknown as LinhaAgendamento[]).map((l) => paraAgendamento(l));
};

export const listarNotificacoes = async (): Promise<NotificationItem[]> => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*, tickets(protocol)')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) erro(error.message);
  return (data as unknown as LinhaNotificacao[]).map(paraNotificacao);
};

// ─── Mutações ───────────────────────────────────────────────────────────────
// Todas passam pelas funções RPC, que são transacionais: registro, evento de
// timeline e notificações numa operação só.

const chamarRpc = async <T>(nome: string, args: Record<string, unknown>): Promise<T> => {
  // O cliente é tipado pelo schema; as RPCs têm assinatura dinâmica demais para
  // esse tipo, e o cast fica isolado aqui em vez de espalhado pelas chamadas.
  const { data, error } = await (
    supabase.rpc as unknown as (
      n: string,
      a: Record<string, unknown>
    ) => Promise<{ data: T; error: { message: string } | null }>
  )(nome, args);

  if (error) erro(error.message);
  return data;
};

export interface NovoChamado {
  propertyId: string;
  environment: string;
  category: MaintenanceTicket['category'];
  description: string;
  urgency: MaintenanceTicket['urgency'];
  preferredPeriod: MaintenanceTicket['preferredPeriod'];
}

export const criarChamado = async (dados: NovoChamado): Promise<string> => {
  const t = await chamarRpc<{ id: string }>('create_ticket', {
    p_property_id: dados.propertyId,
    p_environment: dados.environment,
    p_category: dados.category,
    p_description: dados.description,
    p_urgency: dados.urgency,
    p_preferred_period: dados.preferredPeriod,
  });
  return t.id;
};

export const mudarStatus = async (
  ticketId: string,
  status: TicketStatus,
  descricao?: string
): Promise<void> => {
  await chamarRpc('update_ticket_status', {
    p_ticket_id: ticketId,
    p_status: status,
    p_description: descricao ?? null,
  });
};

export const designarTecnico = async (ticketId: string, technicianId: string): Promise<void> => {
  await chamarRpc('assign_technician', {
    p_ticket_id: ticketId,
    p_technician_id: technicianId,
  });
};

export const enviarMensagem = async (ticketId: string, texto: string): Promise<void> => {
  await chamarRpc('post_message', { p_ticket_id: ticketId, p_body: texto });
};

export interface ParecerTecnico {
  situationFound: string;
  possibleCause: string;
  recommendedSolution: string;
  requiredMaterials: string;
  needsQuote: boolean;
  needsReturn: boolean;
  recommendedPriority: MaintenanceTicket['urgency'];
}

export const salvarParecer = async (ticketId: string, p: ParecerTecnico): Promise<void> => {
  await chamarRpc('save_technical_report', {
    p_ticket_id: ticketId,
    p_situation_found: p.situationFound,
    p_possible_cause: p.possibleCause,
    p_recommended_solution: p.recommendedSolution,
    p_required_materials: p.requiredMaterials,
    p_needs_quote: p.needsQuote,
    p_needs_return: p.needsReturn,
    p_recommended_priority: p.recommendedPriority,
  });
};

export interface NovoOrcamento {
  serviceDescription: string;
  materialsSummary: string;
  laborSummary: string;
  materialsCost: number;
  laborCost: number;
  executionDeadlineDays: number;
  notes?: string;
}

export const enviarOrcamento = async (ticketId: string, o: NovoOrcamento): Promise<void> => {
  await chamarRpc('submit_quote', {
    p_ticket_id: ticketId,
    p_service_description: o.serviceDescription,
    p_materials_summary: o.materialsSummary,
    p_labor_summary: o.laborSummary,
    p_materials_cost: o.materialsCost,
    p_labor_cost: o.laborCost,
    p_execution_deadline_days: o.executionDeadlineDays,
    p_notes: o.notes ?? null,
  });
};

export const decidirOrcamento = async (
  quoteId: string,
  aprovar: boolean,
  motivo?: string
): Promise<void> => {
  await chamarRpc('review_quote', {
    p_quote_id: quoteId,
    p_approve: aprovar,
    p_reason: motivo ?? null,
  });
};

export interface NovoAgendamento {
  technicianId: string;
  /** `YYYY-MM-DD` */
  date: string;
  /** `HH:MM` */
  startTime: string;
  endTime: string;
  ticketId?: string;
  serviceType?: string;
  notes?: string;
}

export const agendar = async (a: NovoAgendamento): Promise<void> => {
  await chamarRpc('schedule_appointment', {
    p_technician_id: a.technicianId,
    p_starts_at: paraInstante(a.date, a.startTime),
    p_ends_at: paraInstante(a.date, a.endTime),
    p_ticket_id: a.ticketId ?? null,
    p_service_type: a.serviceType ?? '',
    p_notes: a.notes ?? null,
  });
};

export const mudarStatusAgendamento = async (
  appointmentId: string,
  status: Appointment['status']
): Promise<void> => {
  await chamarRpc('update_appointment_status', {
    p_appointment_id: appointmentId,
    p_status: status,
  });
};

export interface ConclusaoServico {
  servicesPerformed: string;
  materialsUsed: string;
  warrantyMonths: number;
  observations?: string;
}

export const concluirServico = async (ticketId: string, c: ConclusaoServico): Promise<void> => {
  await chamarRpc('finalize_service', {
    p_ticket_id: ticketId,
    p_services_performed: c.servicesPerformed,
    p_materials_used: c.materialsUsed,
    p_warranty_months: c.warrantyMonths,
    p_observations: c.observations ?? '',
  });
};

export const confirmarConclusao = async (ticketId: string): Promise<void> => {
  await chamarRpc('confirm_tenant_completion', { p_ticket_id: ticketId });
};

export interface NovaAvaliacao {
  rating: number;
  solved: boolean;
  satisfactory: boolean;
  punctual: boolean;
  comments?: string;
}

export const avaliar = async (ticketId: string, a: NovaAvaliacao): Promise<void> => {
  await chamarRpc('submit_evaluation', {
    p_ticket_id: ticketId,
    p_rating: a.rating,
    p_solved: a.solved,
    p_satisfactory: a.satisfactory,
    p_punctual: a.punctual,
    p_comments: a.comments ?? '',
  });
};

export const marcarNotificacaoLida = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id);
  if (error) erro(error.message);
};

export const marcarTodasLidas = async (): Promise<void> => {
  await chamarRpc('mark_all_notifications_read', {});
};

/** Imóveis que o usuário pode usar ao abrir um chamado. A RLS já limita. */
export const listarImoveisDisponiveis = async (): Promise<
  { id: string; code: string; address: string; unit: string | null }[]
> => {
  const { data, error } = await supabase
    .from('properties')
    .select('id, code, address, unit')
    .order('address');
  if (error) erro(error.message);
  return data ?? [];
};
