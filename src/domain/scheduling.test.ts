import { describe, expect, it } from 'vitest';
import { Appointment, AppointmentStatus } from '../types';
import {
  appointmentsForTechnicianOnDate,
  findConflictingAppointment,
  isValidSlot,
  occupiesSchedule,
  overlaps,
} from './scheduling';

const makeAppointment = (overrides: Partial<Appointment> = {}): Appointment => ({
  id: 'apt-1',
  ticketId: 't-1',
  clientName: 'Mariana Costa',
  clientPhone: '(11) 98123-4567',
  address: 'Rua das Acácias, 450 - Apto 402',
  agencyName: 'Aliança Gestão Imobiliária',
  serviceType: 'Reparo hidráulico',
  description: 'Vazamento na pia',
  technicianId: 'tech-carlos',
  technicianName: 'Carlos Santos',
  teamName: 'Equipe Hidráulica',
  date: '2026-09-21',
  startTime: '09:00',
  endTime: '11:00',
  priority: 'normal',
  status: 'agendado',
  ...overrides,
});

describe('overlaps', () => {
  it('detecta sobreposição parcial', () => {
    expect(
      overlaps({ startTime: '10:00', endTime: '12:00' }, { startTime: '09:00', endTime: '11:00' })
    ).toBe(true);
  });

  it('detecta janela contida em outra', () => {
    expect(
      overlaps({ startTime: '09:30', endTime: '10:00' }, { startTime: '09:00', endTime: '11:00' })
    ).toBe(true);
  });

  it('NÃO considera conflito quando as janelas apenas se encostam', () => {
    // Serviço que termina 11:00 e outro que começa 11:00 convivem na agenda.
    expect(
      overlaps({ startTime: '11:00', endTime: '13:00' }, { startTime: '09:00', endTime: '11:00' })
    ).toBe(false);
    expect(
      overlaps({ startTime: '07:00', endTime: '09:00' }, { startTime: '09:00', endTime: '11:00' })
    ).toBe(false);
  });

  it('NÃO considera conflito quando as janelas são disjuntas', () => {
    expect(
      overlaps({ startTime: '14:00', endTime: '16:00' }, { startTime: '09:00', endTime: '11:00' })
    ).toBe(false);
  });
});

describe('isValidSlot', () => {
  it('exige término posterior ao início', () => {
    expect(isValidSlot({ startTime: '09:00', endTime: '11:00' })).toBe(true);
    expect(isValidSlot({ startTime: '11:00', endTime: '09:00' })).toBe(false);
    expect(isValidSlot({ startTime: '09:00', endTime: '09:00' })).toBe(false);
  });
});

describe('occupiesSchedule', () => {
  it.each<[AppointmentStatus, boolean]>([
    ['agendado', true],
    ['confirmado', true],
    ['em_atendimento', true],
    ['concluido', true],
    ['reagendar', true],
    ['cancelado', false],
    ['nao_realizado', false],
  ])('status %s ocupa a agenda: %s', (status, expected) => {
    expect(occupiesSchedule(makeAppointment({ status }))).toBe(expected);
  });
});

describe('findConflictingAppointment', () => {
  const existing = makeAppointment();
  const slot = {
    technicianId: 'tech-carlos',
    date: '2026-09-21',
    startTime: '10:00',
    endTime: '12:00',
  };

  it('acusa conflito no mesmo técnico, mesma data e horário sobreposto', () => {
    expect(findConflictingAppointment([existing], slot)?.id).toBe('apt-1');
  });

  it('não acusa conflito para OUTRO técnico no mesmo horário', () => {
    expect(
      findConflictingAppointment([existing], { ...slot, technicianId: 'tech-jose' })
    ).toBeUndefined();
  });

  it('não acusa conflito em outra data', () => {
    expect(findConflictingAppointment([existing], { ...slot, date: '2026-09-22' })).toBeUndefined();
  });

  it('ignora agendamentos cancelados', () => {
    const cancelado = makeAppointment({ status: 'cancelado' });
    expect(findConflictingAppointment([cancelado], slot)).toBeUndefined();
  });

  it('ignora agendamentos não realizados', () => {
    const naoRealizado = makeAppointment({ status: 'nao_realizado' });
    expect(findConflictingAppointment([naoRealizado], slot)).toBeUndefined();
  });

  it('ignora o próprio agendamento ao reagendar', () => {
    expect(findConflictingAppointment([existing], slot, 'apt-1')).toBeUndefined();
  });

  it('devolve o primeiro conflito encontrado quando há mais de um', () => {
    const outro = makeAppointment({ id: 'apt-2', startTime: '10:30', endTime: '11:30' });
    const conflict = findConflictingAppointment([existing, outro], slot);
    expect(conflict?.id).toBe('apt-1');
  });
});

describe('appointmentsForTechnicianOnDate', () => {
  it('traz só os agendamentos ativos do técnico naquela data', () => {
    const lista = [
      makeAppointment({ id: 'a' }),
      makeAppointment({ id: 'b', status: 'cancelado' }),
      makeAppointment({ id: 'c', date: '2026-09-22' }),
      makeAppointment({ id: 'd', technicianId: 'tech-jose' }),
    ];

    const result = appointmentsForTechnicianOnDate(lista, 'tech-carlos', '2026-09-21');
    expect(result.map((a) => a.id)).toEqual(['a']);
  });
});
