import { describe, expect, it } from 'vitest';
import { Appointment, AuthUser, MaintenanceTicket } from '../types';
import { filterAppointmentsForUser, filterTicketsForUser } from './access';

const makeTicket = (overrides: Partial<MaintenanceTicket> = {}): MaintenanceTicket => ({
  id: 't-1',
  protocol: '#1030',
  createdAt: '21/09/2026 às 10:00',
  updatedAt: '21/09/2026 às 10:00',
  tenantName: 'Mariana Costa',
  tenantPhone: '(11) 98123-4567',
  tenantEmail: 'mariana.costa@email.com',
  address: 'Rua das Acácias, 450 - Apto 402',
  propertyType: 'apartamento',
  environment: 'Cozinha',
  category: 'hidraulica',
  description: 'Vazamento sob a pia',
  photos: [],
  urgency: 'normal',
  preferredPeriod: 'manha',
  status: 'chamado_aberto',
  assignedAgencyId: 'imob-alianca',
  assignedAgencyName: 'Aliança Gestão Imobiliária',
  timeline: [],
  chatMessages: [],
  lastActionAt: '21/09/2026 às 10:00',
  ...overrides,
});

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

const mariana: AuthUser = {
  id: 'user-tenant-mariana',
  name: 'Mariana Costa',
  email: 'mariana.costa@email.com',
  role: 'inquilino',
  propertyAddress: 'Rua das Acácias, 450 - Apto 402',
  agencyId: 'imob-alianca',
  agencyName: 'Aliança Gestão Imobiliária',
};

const alianca: AuthUser = {
  id: 'user-imob-alianca',
  name: 'Aliança Gestão Imobiliária',
  email: 'gestao@aliancaimoveis.com.br',
  role: 'imobiliaria',
  agencyId: 'imob-alianca',
  agencyName: 'Aliança Gestão Imobiliária',
};

const solar: AuthUser = {
  id: 'user-imob-solar',
  name: 'Solar Negócios Imobiliários',
  email: 'contato@solarimoveis.com.br',
  role: 'imobiliaria',
  agencyId: 'imob-solar',
  agencyName: 'Solar Negócios Imobiliários',
};

const carlos: AuthUser = {
  id: 'user-tech-carlos',
  name: 'Carlos Santos (Hidráulica)',
  email: 'carlos.santos@casapronta.com.br',
  role: 'prestador',
  technicianId: 'tech-carlos',
};

const central: AuthUser = {
  id: 'user-empresa-admin',
  name: 'Casa Pronta Manutenções (Central)',
  email: 'admin@casapronta.com.br',
  role: 'empresa',
};

describe('filterTicketsForUser — inquilino', () => {
  it('enxerga o chamado do próprio imóvel', () => {
    const meu = makeTicket();
    expect(filterTicketsForUser([meu], mariana)).toEqual([meu]);
  });

  it('NÃO enxerga chamado de outro imóvel', () => {
    const vizinho = makeTicket({
      id: 't-2',
      tenantName: 'Roberto Nunes',
      tenantEmail: 'roberto.nunes@email.com',
      address: 'Av. Paulista, 1200 - Apto 84',
    });
    expect(filterTicketsForUser([vizinho], mariana)).toEqual([]);
  });

  it('NÃO enxerga outra unidade do mesmo prédio', () => {
    // Regressão: `includes()` bidirecional casava "Rua das Acácias, 450 - Apto 402"
    // com "Rua das Acácias, 450 - Apto 201" e vazava o chamado do vizinho de andar.
    const mesmoPredio = makeTicket({
      id: 't-3',
      tenantName: 'André Siqueira',
      tenantEmail: 'andre.siqueira@email.com',
      address: 'Rua das Acácias, 450 - Apto 201',
    });
    expect(filterTicketsForUser([mesmoPredio], mariana)).toEqual([]);
  });

  it('NÃO enxerga chamado de outra pessoa com o mesmo primeiro nome', () => {
    // Regressão: o filtro casava `tenantName.includes(primeiroNome)`.
    const homonimo = makeTicket({
      id: 't-4',
      tenantName: 'Mariana Ferreira',
      tenantEmail: 'mariana.ferreira@email.com',
      address: 'Rua Augusta, 100 - Apto 12',
    });
    expect(filterTicketsForUser([homonimo], mariana)).toEqual([]);
  });

  it('casa o endereço ignorando acento e caixa', () => {
    const variacao = makeTicket({
      id: 't-5',
      tenantEmail: 'outro@email.com',
      address: 'RUA DAS ACACIAS, 450 - APTO 402',
    });
    expect(filterTicketsForUser([variacao], mariana)).toHaveLength(1);
  });
});

describe('filterTicketsForUser — imobiliária', () => {
  const daAlianca = makeTicket();
  const daSolar = makeTicket({
    id: 't-9',
    assignedAgencyId: 'imob-solar',
    assignedAgencyName: 'Solar Negócios Imobiliários',
  });

  it('enxerga só os chamados da própria carteira', () => {
    expect(filterTicketsForUser([daAlianca, daSolar], alianca)).toEqual([daAlianca]);
  });

  it('NÃO enxerga a carteira de outra imobiliária', () => {
    expect(filterTicketsForUser([daAlianca, daSolar], solar)).toEqual([daSolar]);
  });
});

describe('filterTicketsForUser — prestador', () => {
  it('enxerga só os chamados atribuídos a ele', () => {
    const meu = makeTicket({ assignedTechnicianId: 'tech-carlos' });
    const doJose = makeTicket({ id: 't-7', assignedTechnicianId: 'tech-jose' });
    expect(filterTicketsForUser([meu, doJose], carlos)).toEqual([meu]);
  });

  it('não enxerga nada quando o usuário não tem técnico vinculado', () => {
    const semVinculo: AuthUser = { ...carlos, technicianId: undefined };
    const meu = makeTicket({ assignedTechnicianId: 'tech-carlos' });
    expect(filterTicketsForUser([meu], semVinculo)).toEqual([]);
  });

  it('NÃO usa o nome do técnico como critério', () => {
    // Regressão: havia um fallback literal `assignedTechnicianName.includes('carlos')`.
    const outroCarlos = makeTicket({
      id: 't-8',
      assignedTechnicianId: 'tech-carlos-eduardo',
      assignedTechnicianName: 'Carlos Eduardo',
    });
    expect(filterTicketsForUser([outroCarlos], carlos)).toEqual([]);
  });
});

describe('filterTicketsForUser — empresa e visitante', () => {
  it('a central enxerga tudo', () => {
    const todos = [makeTicket(), makeTicket({ id: 't-2', assignedAgencyId: 'imob-solar' })];
    expect(filterTicketsForUser(todos, central)).toEqual(todos);
  });

  it('sem usuário autenticado não há nada visível', () => {
    expect(filterTicketsForUser([makeTicket()], null)).toEqual([]);
  });
});

describe('filterAppointmentsForUser', () => {
  it('inquilino enxerga o agendamento vinculado a um chamado seu', () => {
    const ticket = makeTicket();
    const apt = makeAppointment({ address: 'Endereço divergente', ticketId: 't-1' });
    expect(filterAppointmentsForUser([apt], mariana, [ticket])).toEqual([apt]);
  });

  it('inquilino enxerga agendamento avulso no próprio endereço', () => {
    const avulso = makeAppointment({ id: 'apt-2', ticketId: undefined });
    expect(filterAppointmentsForUser([avulso], mariana, [])).toEqual([avulso]);
  });

  it('inquilino NÃO enxerga agendamento de outro imóvel', () => {
    const outro = makeAppointment({
      id: 'apt-3',
      ticketId: 't-99',
      address: 'Av. Paulista, 1200 - Apto 84',
    });
    expect(filterAppointmentsForUser([outro], mariana, [])).toEqual([]);
  });

  it('prestador enxerga só a própria agenda', () => {
    const meu = makeAppointment();
    const doJose = makeAppointment({ id: 'apt-4', technicianId: 'tech-jose' });
    expect(filterAppointmentsForUser([meu, doJose], carlos, [])).toEqual([meu]);
  });

  it('imobiliária enxerga só os agendamentos da própria carteira', () => {
    const daAlianca = makeAppointment();
    const daSolar = makeAppointment({ id: 'apt-5', agencyName: 'Solar Negócios Imobiliários' });
    expect(filterAppointmentsForUser([daAlianca, daSolar], alianca, [])).toEqual([daAlianca]);
  });

  it('a central enxerga a agenda global', () => {
    const todos = [makeAppointment(), makeAppointment({ id: 'apt-6', technicianId: 'tech-jose' })];
    expect(filterAppointmentsForUser(todos, central, [])).toEqual(todos);
  });
});
