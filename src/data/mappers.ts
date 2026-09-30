import type {
  Appointment,
  ChatMessage,
  Evaluation,
  MaintenanceTicket,
  NotificationItem,
  Quote,
  ServiceCompletion,
  TechnicalReport,
  Technician,
  TimelineEvent,
} from '../types';
import { dataLocal, formatarDataHora, horaLocal } from './datetime';

/**
 * Tradução das linhas do Postgres para os tipos de domínio que a interface usa.
 *
 * Os componentes foram escritos contra um agregado aninhado (`ticket.quote`,
 * `ticket.appointment`…). O banco é normalizado. Em vez de reescrever dez mil
 * linhas de JSX, a tradução acontece aqui, num só lugar e com teste próprio.
 *
 * Alguns campos existem só para a apresentação e são derivados de JOIN — o
 * endereço do imóvel, o nome da imobiliária, o nome do técnico. Eles não moram
 * na tabela `tickets`: quem manda é a chave estrangeira.
 */

// Formatos das consultas com recursos embutidos do PostgREST.

export interface LinhaImovel {
  id: string;
  code: string;
  address: string;
  unit: string | null;
  neighborhood: string | null;
  property_type: MaintenanceTicket['propertyType'];
  agencies: { id: string; name: string } | null;
}

export interface LinhaPerfil {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}

export interface LinhaTecnico {
  id: string;
  name: string;
  team: string;
  specialties: string[];
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  status: Technician['status'];
  rating: number | null;
  active: boolean;
}

export interface LinhaOrcamento {
  id: string;
  ticket_id: string;
  version: number;
  service_description: string;
  materials_summary: string;
  labor_summary: string;
  materials_cost: number;
  labor_cost: number;
  total_cost: number;
  execution_deadline_days: number;
  notes: string | null;
  status: Quote['status'];
  rejection_reason: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  created_at: string;
}

export interface LinhaAgendamento {
  id: string;
  ticket_id: string | null;
  technician_id: string;
  starts_at: string;
  ends_at: string;
  service_type: string;
  notes: string | null;
  status: Appointment['status'];
  tenant_confirmed: boolean;
  technicians?: LinhaTecnico | null;
  tickets?: {
    protocol: string;
    description: string;
    urgency: MaintenanceTicket['urgency'];
    properties: LinhaImovel | null;
    profiles: LinhaPerfil | null;
  } | null;
}

export interface LinhaParecer {
  id: string;
  ticket_id: string;
  technician_id: string | null;
  technician_name: string;
  tenant_problem: string;
  situation_found: string;
  possible_cause: string;
  recommended_solution: string;
  required_materials: string;
  needs_quote: boolean;
  needs_return: boolean;
  recommended_priority: MaintenanceTicket['urgency'];
  created_at: string;
}

export interface LinhaConclusao {
  id: string;
  ticket_id: string;
  services_performed: string;
  materials_used: string;
  warranty_months: number;
  observations: string;
  tenant_confirmed: boolean;
  tenant_confirmed_at: string | null;
  completed_at: string;
}

export interface LinhaAvaliacao {
  id: string;
  ticket_id: string;
  rating: number;
  solved: boolean;
  satisfactory: boolean;
  punctual: boolean;
  comments: string;
  created_at: string;
}

export interface LinhaEventoTimeline {
  id: string;
  ticket_id: string;
  status: MaintenanceTicket['status'];
  title: string;
  description: string;
  author_name: string;
  author_role: TimelineEvent['authorRole'];
  created_at: string;
}

export interface LinhaAnexo {
  id: string;
  ticket_id: string;
  kind: 'chamado' | 'parecer' | 'orcamento' | 'antes' | 'depois';
  storage_path: string;
  created_at: string;
}

export interface LinhaMensagem {
  id: string;
  ticket_id: string;
  sender_name: string;
  sender_role: ChatMessage['senderRole'];
  body: string;
  created_at: string;
}

export interface LinhaChamado {
  id: string;
  protocol: string;
  property_id: string;
  agency_id: string;
  tenant_profile_id: string | null;
  environment: string;
  category: MaintenanceTicket['category'];
  description: string;
  urgency: MaintenanceTicket['urgency'];
  preferred_period: MaintenanceTicket['preferredPeriod'];
  status: MaintenanceTicket['status'];
  assigned_technician_id: string | null;
  created_at: string;
  updated_at: string;
  last_action_at: string;

  properties: LinhaImovel | null;
  profiles: LinhaPerfil | null;
  technicians: LinhaTecnico | null;
  quotes: LinhaOrcamento[] | null;
  appointments: LinhaAgendamento[] | null;
  technical_reports: LinhaParecer | null;
  service_completions: LinhaConclusao | null;
  evaluations: LinhaAvaliacao | null;
  attachments: LinhaAnexo[] | null;
  ticket_timeline?: LinhaEventoTimeline[] | null;
  ticket_messages?: LinhaMensagem[] | null;
}

/** Endereço completo, no formato que a interface exibe. */
export const enderecoCompleto = (imovel: LinhaImovel | null): string => {
  if (!imovel) return '';
  return imovel.unit ? `${imovel.address} - ${imovel.unit}` : imovel.address;
};

export const paraTecnico = (l: LinhaTecnico): Technician => ({
  id: l.id,
  name: l.name,
  team: l.team,
  specialties: l.specialties,
  phone: l.phone ?? '',
  email: l.email ?? '',
  avatar: l.avatar_url ?? '',
  status: l.status,
  rating: l.rating ?? 0,
  // O protótipo tinha `activeCount` num campo solto. Passou a ser calculado a
  // partir dos chamados, e a lista o preenche quando precisa.
  activeCount: 0,
});

export const paraOrcamento = (l: LinhaOrcamento): Quote => ({
  id: l.id,
  ticketId: l.ticket_id,
  createdAt: formatarDataHora(l.created_at),
  serviceDescription: l.service_description,
  materialsSummary: l.materials_summary,
  laborSummary: l.labor_summary,
  materialsCost: Number(l.materials_cost),
  laborCost: Number(l.labor_cost),
  totalCost: Number(l.total_cost),
  executionDeadlineDays: l.execution_deadline_days,
  notes: l.notes ?? undefined,
  status: l.status,
  rejectionReason: l.rejection_reason ?? undefined,
  approvedAt: l.approved_at ? formatarDataHora(l.approved_at) : undefined,
  rejectedAt: l.rejected_at ? formatarDataHora(l.rejected_at) : undefined,
});

/** Dados do chamado que o agendamento exibe mas não guarda. */
export interface ContextoAgendamento {
  protocol?: string;
  clientName?: string;
  clientPhone?: string;
  address?: string;
  neighborhood?: string;
  agencyName?: string;
  description?: string;
  priority?: MaintenanceTicket['urgency'];
}

export const paraAgendamento = (
  l: LinhaAgendamento,
  contexto: ContextoAgendamento = {}
): Appointment => {
  // O contexto vence quando informado: ao mapear o agendamento embutido num
  // chamado, os dados do imóvel e do inquilino já vieram com o chamado, e
  // repeti-los no JOIN seria desperdício.
  const imovel = l.tickets?.properties ?? null;
  const inquilino = l.tickets?.profiles ?? null;

  return {
    id: l.id,
    ticketId: l.ticket_id ?? undefined,
    protocol: contexto.protocol ?? l.tickets?.protocol,
    clientName: contexto.clientName ?? inquilino?.name ?? '',
    clientPhone: contexto.clientPhone ?? inquilino?.phone ?? '',
    address: contexto.address ?? enderecoCompleto(imovel),
    neighborhood: contexto.neighborhood ?? imovel?.neighborhood ?? undefined,
    agencyName: contexto.agencyName ?? imovel?.agencies?.name ?? '',
    serviceType: l.service_type,
    description: contexto.description ?? l.tickets?.description ?? l.service_type,
    technicianId: l.technician_id,
    technicianName: l.technicians?.name ?? '',
    teamName: l.technicians?.team ?? '',
    // O banco guarda instantes; a interface trabalha com data e hora locais.
    date: dataLocal(l.starts_at),
    startTime: horaLocal(l.starts_at),
    endTime: horaLocal(l.ends_at),
    priority: contexto.priority ?? l.tickets?.urgency ?? 'normal',
    status: l.status,
    notes: l.notes ?? undefined,
    tenantConfirmed: l.tenant_confirmed,
  };
};

export const paraParecer = (l: LinhaParecer, fotos: string[] = []): TechnicalReport => ({
  id: l.id,
  ticketId: l.ticket_id,
  technicianId: l.technician_id ?? '',
  technicianName: l.technician_name,
  createdAt: formatarDataHora(l.created_at),
  tenantProblem: l.tenant_problem,
  situationFound: l.situation_found,
  possibleCause: l.possible_cause,
  recommendedSolution: l.recommended_solution,
  requiredMaterials: l.required_materials,
  needsQuote: l.needs_quote,
  needsReturn: l.needs_return,
  recommendedPriority: l.recommended_priority,
  photos: fotos,
});

export const paraConclusao = (
  l: LinhaConclusao,
  antes: string[] = [],
  depois: string[] = []
): ServiceCompletion => ({
  id: l.id,
  ticketId: l.ticket_id,
  completionDate: formatarDataHora(l.completed_at),
  servicesPerformed: l.services_performed,
  materialsUsed: l.materials_used,
  warrantyMonths: l.warranty_months,
  observations: l.observations,
  beforePhotos: antes,
  afterPhotos: depois,
  tenantConfirmed: l.tenant_confirmed,
  tenantConfirmedAt: l.tenant_confirmed_at ? formatarDataHora(l.tenant_confirmed_at) : undefined,
});

export const paraAvaliacao = (l: LinhaAvaliacao): Evaluation => ({
  id: l.id,
  ticketId: l.ticket_id,
  rating: l.rating,
  solved: l.solved,
  satisfactory: l.satisfactory,
  punctual: l.punctual,
  comments: l.comments,
  createdAt: formatarDataHora(l.created_at),
});

export const paraEventoTimeline = (l: LinhaEventoTimeline): TimelineEvent => ({
  id: l.id,
  status: l.status,
  title: l.title,
  description: l.description,
  timestamp: formatarDataHora(l.created_at),
  authorName: l.author_name,
  authorRole: l.author_role,
});

export const paraMensagem = (l: LinhaMensagem): ChatMessage => ({
  id: l.id,
  ticketId: l.ticket_id,
  senderRole: l.sender_role,
  senderName: l.sender_name,
  message: l.body,
  timestamp: formatarDataHora(l.created_at),
});

/**
 * Chamado completo.
 *
 * `quotes` vem como lista: o banco guarda todas as versões, e a interface mostra
 * a vigente — a de maior `version`. O protótipo sobrescrevia a anterior, o que
 * apagava inclusive o motivo de uma reprovação.
 */
export const paraChamado = (l: LinhaChamado): MaintenanceTicket => {
  const imovel = l.properties;
  const endereco = enderecoCompleto(imovel);

  // `photos` guarda CAMINHOS do Storage, não URLs: o bucket é privado e a URL
  // assinada é pedida na hora de exibir. Ver PhotoGallery.
  const anexos = l.attachments ?? [];
  const caminhosDe = (kind: LinhaAnexo['kind']) =>
    anexos.filter((a) => a.kind === kind).map((a) => a.storage_path);
  const orcamentoVigente = (l.quotes ?? [])
    .slice()
    .sort((a, b) => b.version - a.version)
    .at(0);

  // Agendamento mais recente que ainda ocupa a agenda.
  const agendamento = (l.appointments ?? [])
    .slice()
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at))
    .at(0);

  return {
    id: l.id,
    protocol: l.protocol,
    createdAt: formatarDataHora(l.created_at),
    updatedAt: formatarDataHora(l.updated_at),
    lastActionAt: formatarDataHora(l.last_action_at),

    tenantName: l.profiles?.name ?? '',
    tenantPhone: l.profiles?.phone ?? '',
    tenantEmail: l.profiles?.email ?? undefined,

    address: endereco,
    neighborhood: imovel?.neighborhood ?? undefined,
    propertyType: imovel?.property_type ?? 'outro',

    environment: l.environment,
    category: l.category,
    description: l.description,
    photos: caminhosDe('chamado'),
    urgency: l.urgency,
    preferredPeriod: l.preferred_period,
    status: l.status,

    assignedAgencyId: l.agency_id,
    assignedAgencyName: imovel?.agencies?.name ?? '',
    assignedTechnicianId: l.assigned_technician_id ?? undefined,
    assignedTechnicianName: l.technicians?.name ?? undefined,

    timeline: (l.ticket_timeline ?? []).map(paraEventoTimeline),
    chatMessages: (l.ticket_messages ?? []).map(paraMensagem),
    technicalReport: l.technical_reports
      ? paraParecer(l.technical_reports, caminhosDe('parecer'))
      : undefined,
    quote: orcamentoVigente ? paraOrcamento(orcamentoVigente) : undefined,
    appointment: agendamento
      ? paraAgendamento(agendamento, {
          protocol: l.protocol,
          clientName: l.profiles?.name ?? '',
          clientPhone: l.profiles?.phone ?? '',
          address: endereco,
          neighborhood: imovel?.neighborhood ?? undefined,
          agencyName: imovel?.agencies?.name ?? '',
          description: l.description,
          priority: l.urgency,
        })
      : undefined,
    completion: l.service_completions
      ? paraConclusao(l.service_completions, caminhosDe('antes'), caminhosDe('depois'))
      : undefined,
    evaluation: l.evaluations ? paraAvaliacao(l.evaluations) : undefined,
  };
};

export interface LinhaNotificacao {
  id: string;
  ticket_id: string | null;
  title: string;
  body: string;
  type: NotificationItem['type'];
  read_at: string | null;
  created_at: string;
  tickets?: { protocol: string } | null;
}

export const paraNotificacao = (l: LinhaNotificacao): NotificationItem => ({
  id: l.id,
  ticketId: l.ticket_id ?? undefined,
  protocol: l.tickets?.protocol,
  title: l.title,
  message: l.body,
  timestamp: formatarDataHora(l.created_at),
  read: l.read_at !== null,
  type: l.type,
  // O fan-out agora é por destinatário: se a notificação chegou, é porque é sua.
  targetRoles: [],
});
