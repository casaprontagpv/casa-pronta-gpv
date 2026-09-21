import { Appointment, AuthUser, MaintenanceTicket } from '../types';
import { sameText } from '../utils/helpers';

/**
 * Isolamento de dados por papel — CLAUDE.md §6.
 *
 * ⚠️ Este é um filtro de APRESENTAÇÃO, não um controle de segurança: roda no navegador,
 * sobre dados que o navegador já tem. A garantia real vem das políticas RLS do Postgres
 * na Etapa 2 (docs/PLANO-MIGRACAO.md §3). O que está aqui é a especificação executável
 * dessas políticas — as duas precisam dizer a mesma coisa.
 *
 * Todo casamento é EXATO. Comparação por `includes()` fazia "Rua das Acácias, 450"
 * casar com "Rua das Acácias, 450 - Apto 201" e expor o chamado do vizinho.
 */

export const filterTicketsForUser = (
  tickets: MaintenanceTicket[],
  user: AuthUser | null
): MaintenanceTicket[] => {
  if (!user) return [];

  switch (user.role) {
    case 'inquilino':
      return tickets.filter(
        (t) => sameText(t.tenantEmail, user.email) || sameText(t.address, user.propertyAddress)
      );

    case 'imobiliaria':
      return tickets.filter((t) =>
        user.agencyId
          ? t.assignedAgencyId === user.agencyId
          : sameText(t.assignedAgencyName, user.agencyName)
      );

    case 'prestador':
      if (!user.technicianId) return [];
      return tickets.filter((t) => t.assignedTechnicianId === user.technicianId);

    case 'empresa':
      // Central da prestadora: visão completa.
      return tickets;
  }
};

export const filterAppointmentsForUser = (
  appointments: Appointment[],
  user: AuthUser | null,
  /** Chamados que o usuário já enxerga, para derivar os agendamentos vinculados. */
  visibleTickets: MaintenanceTicket[]
): Appointment[] => {
  if (!user) return [];

  switch (user.role) {
    case 'inquilino': {
      const visibleTicketIds = new Set(visibleTickets.map((t) => t.id));
      return appointments.filter(
        (a) =>
          (a.ticketId != null && visibleTicketIds.has(a.ticketId)) ||
          sameText(a.address, user.propertyAddress)
      );
    }

    case 'imobiliaria':
      return appointments.filter((a) => sameText(a.agencyName, user.agencyName));

    case 'prestador':
      if (!user.technicianId) return [];
      return appointments.filter((a) => a.technicianId === user.technicianId);

    case 'empresa':
      return appointments;
  }
};
