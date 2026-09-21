import type React from 'react';
import { createContext } from 'react';
import {
  UserRole,
  TicketStatus,
  MaintenanceTicket,
  Technician,
  Appointment,
  NotificationItem,
  TechnicalReport,
  Quote,
  ServiceCompletion,
  Evaluation,
  AppointmentStatus,
  AuthUser,
  PropertyType,
  Category,
  PriorityLevel,
  PreferredPeriod,
} from '../types';

export interface AppContextType {
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  currentUser: AuthUser | null;
  allUsers: AuthUser[];
  login: (
    identifier: string,
    password?: string
  ) => { success: boolean; user?: AuthUser; error?: string };
  registerUser: (userData: {
    name: string;
    email: string;
    password?: string;
    role: UserRole;
    phone?: string;
    propertyAddress?: string;
    propertyUnit?: string;
    propertyCode?: string;
    agencyName?: string;
    cnpj?: string;
  }) => { success: boolean; user?: AuthUser; error?: string };
  logout: () => void;
  switchUser: (userId: string) => void;
  activePortalTab: UserRole;
  setActivePortalTab: (tab: UserRole) => void;
  // Data sets
  tickets: MaintenanceTicket[];
  userTickets: MaintenanceTicket[]; // Strictly isolated for current user's property / agency
  technicians: Technician[];
  setTechnicians: React.Dispatch<React.SetStateAction<Technician[]>>;
  appointments: Appointment[];
  userAppointments: Appointment[]; // Strictly isolated
  notifications: NotificationItem[];
  selectedTicket: MaintenanceTicket | null;
  setSelectedTicketId: (id: string | null) => void;
  // Ticket Actions
  createTicket: (data: {
    tenantName: string;
    tenantPhone: string;
    tenantEmail?: string;
    address: string;
    neighborhood?: string;
    propertyType: PropertyType;
    environment: string;
    category: Category;
    description: string;
    photos: string[];
    urgency: PriorityLevel;
    preferredPeriod: PreferredPeriod;
  }) => MaintenanceTicket;
  updateTicketStatus: (ticketId: string, status: TicketStatus, description?: string) => void;
  assignTechnician: (ticketId: string, technicianId: string) => void;
  addChatMessage: (ticketId: string, message: string) => void;
  saveTechnicalReport: (
    ticketId: string,
    report: Omit<TechnicalReport, 'id' | 'createdAt'>
  ) => void;
  submitQuote: (ticketId: string, quoteData: Omit<Quote, 'id' | 'createdAt' | 'status'>) => void;
  reviewQuote: (ticketId: string, decision: 'aprovar' | 'reprovar', reason?: string) => void;
  scheduleAppointment: (aptData: Omit<Appointment, 'id' | 'status'>) => {
    success: boolean;
    conflict?: Appointment;
    appointment?: Appointment;
  };
  updateAppointmentStatus: (appointmentId: string, status: AppointmentStatus) => void;
  finalizeService: (
    ticketId: string,
    completionData: Omit<ServiceCompletion, 'id' | 'completionDate'>
  ) => void;
  confirmTenantCompletion: (ticketId: string) => void;
  submitEvaluation: (ticketId: string, evaluation: Omit<Evaluation, 'id' | 'createdAt'>) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  resetDemoData: () => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);
