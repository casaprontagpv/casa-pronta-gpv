export type UserRole = 'inquilino' | 'imobiliaria' | 'empresa' | 'prestador';

export type TicketStatus =
  | 'chamado_aberto'
  | 'em_analise'
  | 'aguardando_vistoria'
  | 'orcamento_enviado'
  | 'aguardando_aprovacao'
  | 'orcamento_aprovado'
  | 'orcamento_reprovado'
  | 'servico_agendado'
  | 'em_execucao'
  | 'pendente'
  | 'concluido'
  | 'cancelado';

export type PriorityLevel = 'emergencial' | 'alta' | 'normal' | 'baixa';

/** Janela de atendimento preferida pelo inquilino. */
export type PreferredPeriod = 'manha' | 'tarde' | 'integral' | 'sabado';

export type PropertyType = 'apartamento' | 'casa' | 'sobrado' | 'comercial' | 'outro';

export type Category =
  | 'eletrica'
  | 'hidraulica'
  | 'pintura'
  | 'infiltracao'
  | 'porta_fechadura'
  | 'janela'
  | 'revestimento_piso'
  | 'telhado'
  | 'outro';

export type AppointmentStatus =
  | 'agendado'
  | 'confirmado'
  | 'aguardando_confirmacao'
  | 'em_deslocamento'
  | 'em_atendimento'
  | 'concluido'
  | 'reagendar'
  | 'cancelado'
  | 'nao_realizado';

export interface TimelineEvent {
  id: string;
  status: TicketStatus;
  title: string;
  description: string;
  timestamp: string;
  authorName: string;
  authorRole: UserRole;
}

export interface ChatMessage {
  id: string;
  ticketId: string;
  senderRole: UserRole;
  senderName: string;
  message: string;
  timestamp: string;
  attachments?: string[];
}

export interface TechnicalReport {
  id: string;
  ticketId: string;
  technicianId: string;
  technicianName: string;
  createdAt: string;
  tenantProblem: string;
  situationFound: string;
  possibleCause: string;
  recommendedSolution: string;
  requiredMaterials: string;
  needsQuote: boolean;
  needsReturn: boolean;
  recommendedPriority: PriorityLevel;
  photos: string[];
}

export interface Quote {
  id: string;
  ticketId: string;
  createdAt: string;
  serviceDescription: string;
  materialsSummary: string;
  laborSummary: string;
  materialsCost: number;
  laborCost: number;
  totalCost: number;
  executionDeadlineDays: number;
  notes?: string;
  photos?: string[];
  status: 'enviado' | 'aprovado' | 'reprovado';
  rejectionReason?: string;
  approvedAt?: string;
  rejectedAt?: string;
}

export interface Appointment {
  id: string;
  ticketId?: string;
  protocol?: string;
  clientName: string;
  clientPhone: string;
  address: string;
  neighborhood?: string;
  agencyName: string;
  serviceType: string;
  description: string;
  technicianId: string;
  technicianName: string;
  teamName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  priority: PriorityLevel;
  status: AppointmentStatus;
  notes?: string;
  tenantConfirmed?: boolean;
}

export interface ServiceCompletion {
  id: string;
  ticketId: string;
  /** Já formatado para exibição. Para calcular, use `completedAtIso`. */
  completionDate: string;
  /** Instante absoluto, para cálculo de duração. */
  completedAtIso: string;
  servicesPerformed: string;
  materialsUsed: string;
  warrantyMonths: number;
  observations: string;
  beforePhotos: string[];
  afterPhotos: string[];
  tenantConfirmed?: boolean;
  tenantConfirmedAt?: string;
}

export interface Evaluation {
  id: string;
  ticketId: string;
  rating: number; // 1 to 5
  solved: boolean;
  satisfactory: boolean;
  punctual: boolean;
  comments: string;
  createdAt: string;
}

export interface Technician {
  id: string;
  name: string;
  team: string;
  specialties: string[];
  phone: string;
  email: string;
  avatar: string;
  status: 'disponivel' | 'em_atendimento' | 'folga';
  rating: number;
  activeCount: number;
}

export interface MaintenanceTicket {
  id: string;
  protocol: string;
  /**
   * Já formatado para exibição ("21/09/2026 às 09:00").
   *
   * Para qualquer conta com datas use `createdAtIso`: string formatada não se
   * ordena nem se subtrai. Os dois convivem porque a formatação é de saída e
   * toda a interface já consome a versão legível.
   */
  createdAt: string;
  /** Instante absoluto, para cálculo de duração. */
  createdAtIso: string;
  updatedAt: string;
  tenantName: string;
  tenantPhone: string;
  tenantEmail?: string;
  address: string;
  neighborhood?: string;
  propertyType: PropertyType;
  environment: string;
  category: Category;
  description: string;
  /**
   * CAMINHOS no bucket privado, não URLs. O bucket não tem link permanente:
   * a URL assinada é pedida na exibição (ver components/photos/PhotoGallery).
   */
  photos: string[];
  urgency: PriorityLevel;
  preferredPeriod: PreferredPeriod;
  status: TicketStatus;
  assignedAgencyId: string;
  assignedAgencyName: string;
  assignedCompanyId?: string;
  assignedCompanyName?: string;
  assignedTechnicianId?: string;
  assignedTechnicianName?: string;
  timeline: TimelineEvent[];
  technicalReport?: TechnicalReport;
  quote?: Quote;
  appointment?: Appointment;
  completion?: ServiceCompletion;
  evaluation?: Evaluation;
  chatMessages: ChatMessage[];
  lastActionAt: string;
}

export interface NotificationItem {
  id: string;
  ticketId?: string;
  protocol?: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'urgent';
  targetRoles: UserRole[];
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  // Inquilino property binding (access strictly limited to this property)
  propertyAddress?: string;
  propertyUnit?: string;
  propertyCode?: string;
  // Imobiliaria binding (access strictly limited to its managed properties)
  agencyId?: string;
  agencyName?: string;
  cnpj?: string;
  // Prestador/Technician binding
  technicianId?: string;
}
