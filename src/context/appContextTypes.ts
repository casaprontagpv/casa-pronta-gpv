import { createContext } from 'react';
import {
  UserRole,
  TicketStatus,
  MaintenanceTicket,
  Technician,
  Appointment,
  NotificationItem,
  AppointmentStatus,
  AuthUser,
} from '../types';
import type {
  ConclusaoServico,
  NovaAvaliacao,
  NovoAgendamento,
  NovoChamado,
  NovoOrcamento,
  ParecerTecnico,
} from '../data/tickets';

export interface AppContextType {
  /** Usuário autenticado, vindo do AuthProvider. */
  currentUser: AuthUser | null;
  /** Papel do usuário da sessão. Derivado, nunca escolhido. */
  currentRole: UserRole;

  /**
   * Dados já filtrados PELA RLS.
   *
   * `userTickets` e `tickets` apontam para a mesma lista: o banco só devolve o
   * que o usuário pode ver. A distinção existia quando o filtro era
   * client-side; ficou como sinônimo para os componentes não mudarem.
   */
  tickets: MaintenanceTicket[];
  userTickets: MaintenanceTicket[];
  technicians: Technician[];
  appointments: Appointment[];
  userAppointments: Appointment[];
  notifications: NotificationItem[];

  /** `true` no carregamento inicial de cada conjunto. */
  loading: boolean;
  /** Falha de leitura, já traduzida. */
  error: string | null;
  /** Recarrega tudo — usado após uma ação que mexe em vários conjuntos. */
  refresh: () => Promise<void>;

  selectedTicket: MaintenanceTicket | null;
  setSelectedTicketId: (id: string | null) => void;
  /** `true` enquanto o detalhe do chamado selecionado é carregado. */
  loadingSelected: boolean;

  // Ações. Todas assíncronas: agora há ida e volta ao banco, e a interface
  // precisa saber quando terminou e se deu certo.
  createTicket: (data: NovoChamado) => Promise<string>;
  updateTicketStatus: (
    ticketId: string,
    status: TicketStatus,
    description?: string
  ) => Promise<void>;
  assignTechnician: (ticketId: string, technicianId: string) => Promise<void>;
  addChatMessage: (ticketId: string, message: string) => Promise<void>;
  saveTechnicalReport: (ticketId: string, report: ParecerTecnico) => Promise<void>;
  submitQuote: (ticketId: string, quote: NovoOrcamento) => Promise<void>;
  reviewQuote: (quoteId: string, aprovar: boolean, motivo?: string) => Promise<void>;
  scheduleAppointment: (data: NovoAgendamento) => Promise<void>;
  updateAppointmentStatus: (appointmentId: string, status: AppointmentStatus) => Promise<void>;
  finalizeService: (ticketId: string, completion: ConclusaoServico) => Promise<void>;
  confirmTenantCompletion: (ticketId: string) => Promise<void>;
  submitEvaluation: (ticketId: string, evaluation: NovaAvaliacao) => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);
