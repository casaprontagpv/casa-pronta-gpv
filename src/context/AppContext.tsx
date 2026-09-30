import React, { useState, useEffect, useMemo } from 'react';
import { AppContext } from './appContextTypes';
import {
  UserRole,
  TicketStatus,
  MaintenanceTicket,
  Technician,
  Appointment,
  NotificationItem,
  ChatMessage,
  TimelineEvent,
  TechnicalReport,
  Quote,
  ServiceCompletion,
  Evaluation,
  AppointmentStatus,
  PropertyType,
  Category,
  PriorityLevel,
  PreferredPeriod,
} from '../types';
import {
  INITIAL_TICKETS,
  INITIAL_TECHNICIANS,
  INITIAL_APPOINTMENTS,
  INITIAL_NOTIFICATIONS,
} from '../mockData';
import { ROLE_LABELS } from '../utils/helpers';
import { useAuth } from '../auth/useAuth';
import { createId } from '../utils/id';
import { filterAppointmentsForUser, filterTicketsForUser } from '../domain/access';
import { findConflictingAppointment, isValidSlot } from '../domain/scheduling';

const STORAGE_KEY_TICKETS = 'casapronta_tickets_v1';
const STORAGE_KEY_TECH = 'casapronta_technicians_v1';
const STORAGE_KEY_APTS = 'casapronta_appointments_v1';
const STORAGE_KEY_NOTIFS = 'casapronta_notifications_v1';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Custom created users saved locally
  // A sessão vem do Supabase Auth. Este contexto não autentica ninguém: ele só
  // consome o usuário já autenticado para filtrar o que cada papel enxerga.
  const { user: currentUser } = useAuth();
  const currentRole: UserRole = currentUser?.role ?? 'inquilino';

  const [tickets, setTickets] = useState<MaintenanceTicket[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_TICKETS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved tickets', e);
      }
    }
    return INITIAL_TICKETS;
  });

  const [technicians, setTechnicians] = useState<Technician[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_TECH);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved tech', e);
      }
    }
    return INITIAL_TECHNICIANS;
  });

  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_APTS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved apts', e);
      }
    }
    return INITIAL_APPOINTMENTS;
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_NOTIFS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved notifs', e);
      }
    }
    return INITIAL_NOTIFICATIONS;
  });

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(tickets));
  }, [tickets]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_TECH, JSON.stringify(technicians));
  }, [technicians]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_APTS, JSON.stringify(appointments));
  }, [appointments]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify(notifications));
  }, [notifications]);


  // Isolamento de dados por papel — a regra vive em src/domain/access.ts (CLAUDE.md §6).
  const userTickets = useMemo(
    () => filterTicketsForUser(tickets, currentUser),
    [tickets, currentUser]
  );

  const userAppointments = useMemo(
    () => filterAppointmentsForUser(appointments, currentUser, userTickets),
    [appointments, currentUser, userTickets]
  );

  const getAuthorName = (role: UserRole) => {
    if (currentUser && currentUser.role === role) {
      return `${currentUser.name} (${ROLE_LABELS[role]})`;
    }
    return ROLE_LABELS[role];
  };

  const addNotification = (
    title: string,
    message: string,
    targetRoles: UserRole[],
    type: 'info' | 'success' | 'warning' | 'urgent' = 'info',
    ticketId?: string,
    protocol?: string
  ) => {
    const newNotif: NotificationItem = {
      id: createId('notif'),
      ticketId,
      protocol,
      title,
      message,
      timestamp: 'Agora mesmo',
      read: false,
      type,
      targetRoles,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const createTicket = (data: {
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
  }) => {
    // Deriva do maior protocolo existente, não de `tickets.length`: com o length,
    // um chamado removido ou um reset de dados gerava protocolo repetido.
    // Vira uma sequência no banco na Etapa 2 (docs/PLANO-MIGRACAO.md §3).
    const highestProtocol = tickets.reduce((max, t) => {
      const parsed = Number.parseInt(t.protocol.replace(/\D/g, ''), 10);
      return Number.isNaN(parsed) ? max : Math.max(max, parsed);
    }, 1029);
    const nextProtocolNumber = highestProtocol + 1;
    const protocol = `#${nextProtocolNumber}`;
    const id = `t-${nextProtocolNumber}`;
    const now = new Date();
    const formattedDate = `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

    const newTimelineEvent: TimelineEvent = {
      id: createId('tl'),
      status: 'chamado_aberto',
      title: 'Chamado Aberto pelo Inquilino',
      description: `Chamado registrado com sucesso. Aguardando análise da imobiliária.`,
      timestamp: formattedDate,
      authorName: data.tenantName,
      authorRole: 'inquilino',
    };

    const newTicket: MaintenanceTicket = {
      id,
      protocol,
      createdAt: formattedDate,
      updatedAt: formattedDate,
      tenantName: data.tenantName,
      tenantPhone: data.tenantPhone,
      tenantEmail: data.tenantEmail,
      address: data.address,
      neighborhood: data.neighborhood || 'São Paulo - SP',
      propertyType: data.propertyType,
      environment: data.environment,
      category: data.category,
      description: data.description,
      photos: data.photos,
      urgency: data.urgency,
      preferredPeriod: data.preferredPeriod,
      status: 'chamado_aberto',
      assignedAgencyId:
        currentUser?.role === 'inquilino' && currentUser.agencyId
          ? currentUser.agencyId
          : 'imob-alianca',
      assignedAgencyName:
        currentUser?.role === 'inquilino' && currentUser.agencyName
          ? currentUser.agencyName
          : 'Aliança Gestão Imobiliária',
      assignedCompanyId: 'emp-casapronta',
      assignedCompanyName: 'Casa Pronta Manutenções',
      timeline: [newTimelineEvent],
      chatMessages: [
        {
          id: createId('msg'),
          ticketId: id,
          senderRole: 'inquilino',
          senderName: data.tenantName,
          message: `Olá! Abri este chamado para o problema: ${data.description}`,
          timestamp: formattedDate,
        },
      ],
      lastActionAt: formattedDate,
    };

    setTickets((prev) => [newTicket, ...prev]);

    addNotification(
      `Novo Chamado ${protocol}`,
      `O inquilino ${data.tenantName} abriu um chamado para ${data.environment} (${data.category}) no endereço ${data.address}.`,
      ['imobiliaria', 'empresa'],
      data.urgency === 'emergencial' ? 'urgent' : 'info',
      id,
      protocol
    );

    return newTicket;
  };

  const updateTicketStatus = (ticketId: string, newStatus: TicketStatus, description?: string) => {
    const now = new Date();
    const formattedDate = `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

    const statusTitles: Record<TicketStatus, string> = {
      chamado_aberto: 'Chamado Aberto',
      em_analise: 'Em Análise pela Imobiliária',
      aguardando_vistoria: 'Aguardando Vistoria / Agendamento',
      orcamento_enviado: 'Orçamento Enviado',
      aguardando_aprovacao: 'Aguardando Aprovação de Orçamento',
      orcamento_aprovado: 'Orçamento Aprovado',
      orcamento_reprovado: 'Orçamento Reprovado',
      servico_agendado: 'Serviço Agendado',
      em_execucao: 'Serviço em Execução',
      pendente: 'Chamado com Pendência',
      concluido: 'Serviço Concluído',
      cancelado: 'Chamado Cancelado',
    };

    setTickets((prev) =>
      prev.map((t) => {
        if (t.id !== ticketId) return t;

        const timelineEvent: TimelineEvent = {
          id: createId('tl'),
          status: newStatus,
          title: statusTitles[newStatus] || newStatus,
          description:
            description || `Status do chamado alterado para "${statusTitles[newStatus]}".`,
          timestamp: formattedDate,
          authorName: getAuthorName(currentRole),
          authorRole: currentRole,
        };

        return {
          ...t,
          status: newStatus,
          updatedAt: formattedDate,
          lastActionAt: formattedDate,
          timeline: [...t.timeline, timelineEvent],
        };
      })
    );

    const ticket = tickets.find((t) => t.id === ticketId);
    if (ticket) {
      addNotification(
        `Atualização no Chamado ${ticket.protocol}`,
        description || `O status mudou para: ${statusTitles[newStatus]}.`,
        ['inquilino', 'imobiliaria', 'empresa', 'prestador'],
        newStatus === 'concluido'
          ? 'success'
          : newStatus === 'orcamento_reprovado'
            ? 'warning'
            : 'info',
        ticket.id,
        ticket.protocol
      );
    }
  };

  const assignTechnician = (ticketId: string, technicianId: string) => {
    const tech = technicians.find((t) => t.id === technicianId);
    if (!tech) return;

    const now = new Date();
    const formattedDate = `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

    setTickets((prev) =>
      prev.map((t) => {
        if (t.id !== ticketId) return t;

        const timelineEvent: TimelineEvent = {
          id: createId('tl'),
          status: t.status,
          title: 'Prestador Designado',
          description: `O técnico ${tech.name} (${tech.team}) foi designado para o atendimento.`,
          timestamp: formattedDate,
          authorName: 'Casa Pronta Manutenções',
          authorRole: 'empresa',
        };

        return {
          ...t,
          assignedTechnicianId: tech.id,
          assignedTechnicianName: tech.name,
          updatedAt: formattedDate,
          timeline: [...t.timeline, timelineEvent],
        };
      })
    );

    const ticket = tickets.find((t) => t.id === ticketId);
    addNotification(
      `Técnico Designado ${ticket?.protocol || ''}`,
      `O técnico ${tech.name} foi designado para o atendimento no endereço ${ticket?.address}.`,
      ['inquilino', 'prestador', 'imobiliaria'],
      'info',
      ticketId,
      ticket?.protocol
    );
  };

  const addChatMessage = (ticketId: string, message: string) => {
    if (!message.trim()) return;
    const now = new Date();
    const formattedDate = `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

    const newMsg: ChatMessage = {
      id: createId('msg'),
      ticketId,
      senderRole: currentRole,
      senderName: getAuthorName(currentRole),
      message,
      timestamp: formattedDate,
    };

    setTickets((prev) =>
      prev.map((t) => {
        if (t.id !== ticketId) return t;
        return {
          ...t,
          chatMessages: [...t.chatMessages, newMsg],
        };
      })
    );
  };

  const saveTechnicalReport = (
    ticketId: string,
    reportData: Omit<TechnicalReport, 'id' | 'createdAt'>
  ) => {
    const now = new Date();
    const formattedDate = `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

    const newReport: TechnicalReport = {
      id: createId('rep'),
      createdAt: formattedDate,
      ...reportData,
    };

    setTickets((prev) =>
      prev.map((t) => {
        if (t.id !== ticketId) return t;

        const timelineEvent: TimelineEvent = {
          id: createId('tl'),
          status: 'aguardando_vistoria',
          title: 'Parecer Técnico Registrado',
          description: `Técnico ${reportData.technicianName} registrou o laudo no local: "${reportData.recommendedSolution.slice(0, 80)}..."`,
          timestamp: formattedDate,
          authorName: reportData.technicianName,
          authorRole: 'prestador',
        };

        return {
          ...t,
          status: reportData.needsQuote ? 'aguardando_vistoria' : t.status,
          technicalReport: newReport,
          urgency: reportData.recommendedPriority || t.urgency,
          updatedAt: formattedDate,
          timeline: [...t.timeline, timelineEvent],
        };
      })
    );

    const ticket = tickets.find((t) => t.id === ticketId);
    addNotification(
      `Novo Parecer Técnico no Chamado ${ticket?.protocol || ''}`,
      `O técnico ${reportData.technicianName} emitiu o parecer para ${ticket?.address}. Verifique a solução recomendada e orçamentos.`,
      ['imobiliaria', 'empresa'],
      'info',
      ticketId,
      ticket?.protocol
    );
  };

  const submitQuote = (ticketId: string, quoteData: Omit<Quote, 'id' | 'createdAt' | 'status'>) => {
    const now = new Date();
    const formattedDate = `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

    const newQuote: Quote = {
      id: createId('qt'),
      createdAt: formattedDate,
      status: 'enviado',
      ...quoteData,
    };

    setTickets((prev) =>
      prev.map((t) => {
        if (t.id !== ticketId) return t;

        const timelineEvent: TimelineEvent = {
          id: createId('tl'),
          status: 'orcamento_enviado',
          title: 'Orçamento Enviado para Aprovação',
          description: `Orçamento de R$ ${quoteData.totalCost.toFixed(2)} disponibilizado para avaliação da Imobiliária.`,
          timestamp: formattedDate,
          authorName: 'Casa Pronta Manutenções',
          authorRole: 'empresa',
        };

        return {
          ...t,
          status: 'orcamento_enviado',
          quote: newQuote,
          updatedAt: formattedDate,
          timeline: [...t.timeline, timelineEvent],
        };
      })
    );

    const ticket = tickets.find((t) => t.id === ticketId);
    addNotification(
      `Orçamento Enviado ${ticket?.protocol || ''}`,
      `O orçamento no valor de R$ ${quoteData.totalCost.toFixed(2)} está aguardando aprovação da imobiliária.`,
      ['imobiliaria', 'inquilino'],
      'warning',
      ticketId,
      ticket?.protocol
    );
  };

  const reviewQuote = (ticketId: string, decision: 'aprovar' | 'reprovar', reason?: string) => {
    const now = new Date();
    const formattedDate = `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    const isApproved = decision === 'aprovar';

    setTickets((prev) =>
      prev.map((t) => {
        if (t.id !== ticketId || !t.quote) return t;

        const updatedQuote: Quote = {
          ...t.quote,
          status: isApproved ? 'aprovado' : 'reprovado',
          rejectionReason: !isApproved ? reason : undefined,
          approvedAt: isApproved ? formattedDate : undefined,
          rejectedAt: !isApproved ? formattedDate : undefined,
        };

        const timelineEvent: TimelineEvent = {
          id: createId('tl'),
          status: isApproved ? 'orcamento_aprovado' : 'orcamento_reprovado',
          title: isApproved ? 'Orçamento Aprovado pela Imobiliária' : 'Orçamento Reprovado',
          description: isApproved
            ? `Orçamento no valor de R$ ${t.quote.totalCost.toFixed(2)} aprovado. Liberado para agendamento.`
            : `Orçamento reprovado pela imobiliária. Motivo: ${reason || 'Não informado'}.`,
          timestamp: formattedDate,
          authorName: 'Aliança Imobiliária',
          authorRole: 'imobiliaria',
        };

        return {
          ...t,
          status: isApproved ? 'orcamento_aprovado' : 'orcamento_reprovado',
          quote: updatedQuote,
          updatedAt: formattedDate,
          timeline: [...t.timeline, timelineEvent],
        };
      })
    );

    const ticket = tickets.find((t) => t.id === ticketId);
    addNotification(
      isApproved
        ? `Orçamento Aprovado ${ticket?.protocol || ''}`
        : `Orçamento Reprovado ${ticket?.protocol || ''}`,
      isApproved
        ? `O orçamento do chamado ${ticket?.protocol} foi APROVADO! O serviço já pode ser agendado.`
        : `O orçamento do chamado ${ticket?.protocol} foi REPROVADO. Motivo: ${reason}`,
      ['empresa', 'prestador', 'inquilino'],
      isApproved ? 'success' : 'warning',
      ticketId,
      ticket?.protocol
    );
  };

  const scheduleAppointment = (
    aptData: Omit<Appointment, 'id' | 'status'>
  ): { success: boolean; conflict?: Appointment; appointment?: Appointment } => {
    // Check for technician scheduling conflicts:
    // Same technician, same date, overlapping time window
    if (!isValidSlot(aptData)) {
      return { success: false };
    }

    // Mesmo técnico, mesma data, janelas sobrepostas (CLAUDE.md §7).
    const conflict = findConflictingAppointment(appointments, aptData);
    if (conflict) {
      return { success: false, conflict };
    }

    const newAppointment: Appointment = {
      id: createId('apt'),
      status: 'agendado',
      tenantConfirmed: false,
      ...aptData,
    };

    setAppointments((prev) => [newAppointment, ...prev]);

    const now = new Date();
    const formattedDate = `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

    // If linked to a ticket, update ticket status and link appointment
    if (aptData.ticketId) {
      setTickets((prev) =>
        prev.map((t) => {
          if (t.id !== aptData.ticketId) return t;

          const timelineEvent: TimelineEvent = {
            id: createId('tl'),
            status: 'servico_agendado',
            title: 'Serviço Agendado',
            description: `Atendimento agendado para o dia ${new Date(aptData.date + 'T00:00:00').toLocaleDateString('pt-BR')} das ${aptData.startTime} às ${aptData.endTime} com o técnico ${aptData.technicianName}.`,
            timestamp: formattedDate,
            authorName: 'Casa Pronta Manutenções',
            authorRole: 'empresa',
          };

          return {
            ...t,
            status: 'servico_agendado',
            assignedTechnicianId: aptData.technicianId,
            assignedTechnicianName: aptData.technicianName,
            appointment: newAppointment,
            updatedAt: formattedDate,
            timeline: [...t.timeline, timelineEvent],
          };
        })
      );
    }

    addNotification(
      `Novo Atendimento Agendado`,
      `Serviço agendado para ${new Date(aptData.date + 'T00:00:00').toLocaleDateString('pt-BR')} às ${aptData.startTime} no imóvel ${aptData.address} (${aptData.technicianName}).`,
      ['inquilino', 'prestador', 'imobiliaria', 'empresa'],
      'info',
      aptData.ticketId,
      aptData.protocol
    );

    return { success: true, appointment: newAppointment };
  };

  const updateAppointmentStatus = (appointmentId: string, newStatus: AppointmentStatus) => {
    const applyStatus = (apt: Appointment): Appointment => ({
      ...apt,
      status: newStatus,
      tenantConfirmed: newStatus === 'confirmado' ? true : apt.tenantConfirmed,
    });

    setAppointments((prev) =>
      prev.map((apt) => (apt.id === appointmentId ? applyStatus(apt) : apt))
    );

    // O agendamento existe em dois lugares: a lista global e a cópia dentro do chamado.
    // Atualizar só a lista fazia as duas divergirem — ex.: "Confirmar Presença" sumia da
    // lista mas continuava aparecendo no detalhe do chamado.
    setTickets((prev) =>
      prev.map((t) =>
        t.appointment?.id === appointmentId ? { ...t, appointment: applyStatus(t.appointment) } : t
      )
    );

    const apt = appointments.find((a) => a.id === appointmentId);
    if (apt && apt.ticketId) {
      if (newStatus === 'em_atendimento') {
        updateTicketStatus(
          apt.ticketId,
          'em_execucao',
          `Técnico ${apt.technicianName} iniciou o atendimento no imóvel.`
        );
      } else if (newStatus === 'confirmado') {
        addNotification(
          `Inquilino Confirmou Presença`,
          `${apt.clientName} confirmou disponibilidade para o atendimento de ${apt.date} às ${apt.startTime}.`,
          ['empresa', 'prestador'],
          'success',
          apt.ticketId,
          apt.protocol
        );
      }
    }
  };

  const finalizeService = (
    ticketId: string,
    completionData: Omit<ServiceCompletion, 'id' | 'completionDate'>
  ) => {
    const now = new Date();
    const formattedDate = `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

    const completion: ServiceCompletion = {
      id: createId('comp'),
      completionDate: formattedDate,
      ...completionData,
    };

    setTickets((prev) =>
      prev.map((t) => {
        if (t.id !== ticketId) return t;

        const timelineEvent: TimelineEvent = {
          id: createId('tl'),
          status: 'concluido',
          title: 'Conclusão do Serviço Registrada',
          description: `Serviço finalizado: ${completionData.servicesPerformed}. Garantia: ${completionData.warrantyMonths} meses. Aguardando confirmação e avaliação do inquilino.`,
          timestamp: formattedDate,
          authorName: t.assignedTechnicianName || 'Técnico Prestador',
          authorRole: 'prestador',
        };

        return {
          ...t,
          status: 'concluido',
          completion,
          // Mantém a cópia embutida do agendamento em sincronia com a lista global.
          appointment: t.appointment ? { ...t.appointment, status: 'concluido' } : t.appointment,
          updatedAt: formattedDate,
          lastActionAt: formattedDate,
          timeline: [...t.timeline, timelineEvent],
        };
      })
    );

    // Update appointment as well
    setAppointments((prev) =>
      prev.map((a) => {
        if (a.ticketId === ticketId) {
          return { ...a, status: 'concluido' };
        }
        return a;
      })
    );

    const ticket = tickets.find((t) => t.id === ticketId);
    addNotification(
      `Serviço Concluído ${ticket?.protocol || ''}`,
      `O técnico finalizou a manutenção no imóvel ${ticket?.address}. Inquilino, por favor confirme e avalie o atendimento.`,
      ['inquilino', 'imobiliaria', 'empresa'],
      'success',
      ticketId,
      ticket?.protocol
    );
  };

  const confirmTenantCompletion = (ticketId: string) => {
    const now = new Date();
    const formattedDate = `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

    setTickets((prev) =>
      prev.map((t) => {
        if (t.id !== ticketId || !t.completion) return t;

        const timelineEvent: TimelineEvent = {
          id: createId('tl'),
          status: 'concluido',
          title: 'Inquilino Confirmou a Realização',
          description: `O inquilino testou e atestou que o problema foi devidamente solucionado.`,
          timestamp: formattedDate,
          authorName: t.tenantName,
          authorRole: 'inquilino',
        };

        return {
          ...t,
          completion: {
            ...t.completion,
            tenantConfirmed: true,
            tenantConfirmedAt: formattedDate,
          },
          timeline: [...t.timeline, timelineEvent],
        };
      })
    );
  };

  const submitEvaluation = (ticketId: string, evalData: Omit<Evaluation, 'id' | 'createdAt'>) => {
    const now = new Date();
    const formattedDate = `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

    const newEval: Evaluation = {
      id: createId('eval'),
      createdAt: formattedDate,
      ...evalData,
    };

    setTickets((prev) =>
      prev.map((t) => {
        if (t.id !== ticketId) return t;

        const timelineEvent: TimelineEvent = {
          id: createId('tl'),
          status: 'concluido',
          title: `Avaliação do Atendimento: ${evalData.rating} Estrelas`,
          description: `Avaliação recebida: "${evalData.comments || 'Sem comentários adicionais'}".`,
          timestamp: formattedDate,
          authorName: t.tenantName,
          authorRole: 'inquilino',
        };

        return {
          ...t,
          evaluation: newEval,
          timeline: [...t.timeline, timelineEvent],
        };
      })
    );

    const ticket = tickets.find((t) => t.id === ticketId);
    addNotification(
      `Nova Avaliação Recebida (${evalData.rating}★)`,
      `O inquilino ${ticket?.tenantName} avaliou o atendimento do chamado ${ticket?.protocol} com nota ${evalData.rating}/5.`,
      ['imobiliaria', 'empresa', 'prestador'],
      'success',
      ticketId,
      ticket?.protocol
    );
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const resetDemoData = () => {
    setTickets(INITIAL_TICKETS);
    setTechnicians(INITIAL_TECHNICIANS);
    setAppointments(INITIAL_APPOINTMENTS);
    setNotifications(INITIAL_NOTIFICATIONS);
    localStorage.removeItem(STORAGE_KEY_TICKETS);
    localStorage.removeItem(STORAGE_KEY_TECH);
    localStorage.removeItem(STORAGE_KEY_APTS);
    localStorage.removeItem(STORAGE_KEY_NOTIFS);
  };

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId) || null;

  return (
    <AppContext.Provider
      value={{
        currentUser,
        currentRole,
        tickets,
        userTickets,
        technicians,
        setTechnicians,
        appointments,
        userAppointments,
        notifications,
        selectedTicket,
        setSelectedTicketId,
        createTicket,
        updateTicketStatus,
        assignTechnician,
        addChatMessage,
        saveTechnicalReport,
        submitQuote,
        reviewQuote,
        scheduleAppointment,
        updateAppointmentStatus,
        finalizeService,
        confirmTenantCompletion,
        submitEvaluation,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        resetDemoData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
