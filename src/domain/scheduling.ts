import { Appointment, AppointmentStatus } from '../types';

/**
 * Agendamentos nesses status não ocupam a agenda do técnico e por isso
 * nunca geram conflito (CLAUDE.md §7).
 */
const INACTIVE_STATUSES: AppointmentStatus[] = ['cancelado', 'nao_realizado'];

export const occupiesSchedule = (appointment: Appointment): boolean =>
  !INACTIVE_STATUSES.includes(appointment.status);

/** Janela de atendimento candidata, antes de virar um `Appointment`. */
export interface TimeSlot {
  technicianId: string;
  /** ISO `YYYY-MM-DD` */
  date: string;
  /** `HH:MM` */
  startTime: string;
  /** `HH:MM` */
  endTime: string;
}

/** Uma janela é válida quando termina depois de começar. */
export const isValidSlot = (slot: Pick<TimeSlot, 'startTime' | 'endTime'>): boolean =>
  slot.startTime < slot.endTime;

/**
 * Duas janelas se sobrepõem quando `novoInício < fimExistente && novoFim > inícioExistente`.
 *
 * Encostar não é sobrepor: um serviço que termina 10:00 e outro que começa 10:00 convivem.
 * A comparação é lexicográfica sobre `HH:MM`, que para horário zero-padded equivale à numérica.
 */
export const overlaps = (
  a: Pick<TimeSlot, 'startTime' | 'endTime'>,
  b: Pick<TimeSlot, 'startTime' | 'endTime'>
): boolean => a.startTime < b.endTime && a.endTime > b.startTime;

/**
 * Procura um agendamento conflitante: mesmo técnico, mesma data, janelas sobrepostas.
 *
 * Fonte única da regra — `AppContext.scheduleAppointment` e o aviso em tempo real do
 * `ScheduleModal` consomem esta função, em vez de cada um reimplementar a comparação.
 * Na Etapa 2 a mesma regra vira uma constraint `EXCLUDE` no Postgres.
 */
export const findConflictingAppointment = (
  appointments: Appointment[],
  slot: TimeSlot,
  /** Ignora um agendamento específico — útil ao reagendar. */
  ignoreAppointmentId?: string
): Appointment | undefined =>
  appointments.find(
    (existing) =>
      existing.id !== ignoreAppointmentId &&
      existing.technicianId === slot.technicianId &&
      existing.date === slot.date &&
      occupiesSchedule(existing) &&
      overlaps(slot, existing)
  );

/** Agendamentos que ocupam a agenda de um técnico em uma data. */
export const appointmentsForTechnicianOnDate = (
  appointments: Appointment[],
  technicianId: string,
  date: string
): Appointment[] =>
  appointments.filter(
    (a) => a.technicianId === technicianId && a.date === date && occupiesSchedule(a)
  );
