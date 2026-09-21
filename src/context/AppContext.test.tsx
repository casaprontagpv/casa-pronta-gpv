import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { AppProvider } from './AppContext';
import { useApp } from './useApp';
import { toIsoDate } from '../utils/helpers';

/**
 * Cobre o ciclo de vida do chamado descrito em CLAUDE.md §5.
 *
 * Estas asserções são a especificação executável das funções RPC que a Etapa 2
 * vai criar no Postgres — as duas precisam concordar.
 */

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AppProvider>{children}</AppProvider>
);

const renderApp = () => renderHook(() => useApp(), { wrapper });

const novoChamado = {
  tenantName: 'Mariana Costa',
  tenantPhone: '(11) 98123-4567',
  tenantEmail: 'mariana.costa@email.com',
  address: 'Rua das Acácias, 450 - Apto 402',
  propertyType: 'apartamento' as const,
  environment: 'Cozinha',
  category: 'hidraulica' as const,
  description: 'Vazamento sob a pia',
  photos: [],
  urgency: 'alta' as const,
  preferredPeriod: 'manha' as const,
};

beforeEach(() => {
  localStorage.clear();
});

describe('autenticação de demonstração', () => {
  it('rejeita senha errada', () => {
    const { result } = renderApp();
    let res!: ReturnType<typeof result.current.login>;
    act(() => {
      res = result.current.login('mariana.costa@email.com', 'senha-errada');
    });
    expect(res.success).toBe(false);
  });

  it('rejeita as senhas universais que existiam antes', () => {
    // Regressão: `login()` aceitava '123' e 'admin' para QUALQUER usuário.
    const { result } = renderApp();
    let res!: ReturnType<typeof result.current.login>;
    act(() => {
      res = result.current.login('admin@casapronta.com.br', '123');
    });
    expect(res.success).toBe(false);
  });

  it('rejeita login por fragmento de nome', () => {
    // Regressão: `u.name.includes(input)` deixava "cost" entrar como Mariana Costa.
    const { result } = renderApp();
    let res!: ReturnType<typeof result.current.login>;
    act(() => {
      res = result.current.login('cost', '123');
    });
    expect(res.success).toBe(false);
  });

  it('aceita e-mail com a senha correta e não expõe a senha', () => {
    const { result } = renderApp();
    let res!: ReturnType<typeof result.current.login>;
    act(() => {
      res = result.current.login('mariana.costa@email.com', '123');
    });
    expect(res.success).toBe(true);
    expect(res.user).toBeDefined();
    expect(res.user).not.toHaveProperty('demoPassword');
    expect(JSON.stringify(result.current.currentUser)).not.toContain('demoPassword');
  });
});

describe('ciclo de vida do chamado', () => {
  it('percorre o caminho feliz e registra cada etapa na timeline', () => {
    const { result } = renderApp();

    act(() => {
      result.current.login('mariana.costa@email.com', '123');
    });

    let ticketId = '';
    act(() => {
      ticketId = result.current.createTicket(novoChamado).id;
    });

    const find = () => result.current.tickets.find((t) => t.id === ticketId)!;

    expect(find().status).toBe('chamado_aberto');
    expect(find().timeline).toHaveLength(1);

    // Imobiliária autoriza a vistoria
    act(() => {
      result.current.updateTicketStatus(ticketId, 'em_analise');
    });
    expect(find().status).toBe('em_analise');

    // Parecer técnico com needsQuote move para aguardando_vistoria
    // e sobrescreve a prioridade do chamado (CLAUDE.md §5, regra 3).
    act(() => {
      result.current.saveTechnicalReport(ticketId, {
        ticketId,
        technicianId: 'tech-carlos',
        technicianName: 'Carlos Santos',
        tenantProblem: 'Vazamento sob a pia',
        situationFound: 'Sifão trincado',
        possibleCause: 'Fadiga do material',
        recommendedSolution: 'Troca do sifão',
        requiredMaterials: '1x sifão',
        needsQuote: true,
        needsReturn: false,
        recommendedPriority: 'emergencial',
        photos: [],
      });
    });
    expect(find().status).toBe('aguardando_vistoria');
    expect(find().urgency).toBe('emergencial');

    // Orçamento enviado
    act(() => {
      result.current.submitQuote(ticketId, {
        ticketId,
        serviceDescription: 'Troca do sifão',
        materialsSummary: '1x sifão',
        laborSummary: 'Mão de obra',
        materialsCost: 100,
        laborCost: 200,
        totalCost: 300,
        executionDeadlineDays: 1,
      });
    });
    expect(find().status).toBe('orcamento_enviado');
    expect(find().quote?.status).toBe('enviado');

    // Imobiliária aprova
    act(() => {
      result.current.reviewQuote(ticketId, 'aprovar');
    });
    expect(find().status).toBe('orcamento_aprovado');
    expect(find().quote?.status).toBe('aprovado');
    expect(find().quote?.approvedAt).toBeTruthy();

    // Agendamento
    act(() => {
      const res = result.current.scheduleAppointment({
        ticketId,
        clientName: novoChamado.tenantName,
        clientPhone: novoChamado.tenantPhone,
        address: novoChamado.address,
        agencyName: 'Aliança Gestão Imobiliária',
        serviceType: 'Troca do sifão',
        description: 'Troca do sifão',
        technicianId: 'tech-carlos',
        technicianName: 'Carlos Santos',
        teamName: 'Equipe Hidráulica',
        date: toIsoDate(),
        startTime: '09:00',
        endTime: '11:00',
        priority: 'alta',
      });
      expect(res.success).toBe(true);
    });
    expect(find().status).toBe('servico_agendado');
    expect(find().assignedTechnicianId).toBe('tech-carlos');

    // Conclusão pelo técnico
    act(() => {
      result.current.finalizeService(ticketId, {
        ticketId,
        servicesPerformed: 'Sifão substituído',
        materialsUsed: '1x sifão',
        warrantyMonths: 3,
        observations: '',
        beforePhotos: [],
        afterPhotos: [],
      });
    });
    expect(find().status).toBe('concluido');
    // finalizeService também fecha o agendamento (CLAUDE.md §5, regra 7).
    expect(find().appointment?.status).toBe('concluido');

    // Aceite do inquilino NÃO muda o status (regra 8)
    act(() => {
      result.current.confirmTenantCompletion(ticketId);
    });
    expect(find().status).toBe('concluido');
    expect(find().completion?.tenantConfirmed).toBe(true);

    // Avaliação também não muda o status (regra 9)
    act(() => {
      result.current.submitEvaluation(ticketId, {
        ticketId,
        rating: 5,
        solved: true,
        satisfactory: true,
        punctual: true,
        comments: 'Excelente',
      });
    });
    expect(find().status).toBe('concluido');
    expect(find().evaluation?.rating).toBe(5);

    // A timeline é append-only: cresceu a cada etapa e nada foi removido.
    const timeline = find().timeline;
    expect(timeline.length).toBeGreaterThanOrEqual(8);
    expect(timeline[0]?.status).toBe('chamado_aberto');
    expect(new Set(timeline.map((e) => e.id)).size).toBe(timeline.length);
  });

  it('reprovação de orçamento grava o motivo', () => {
    const { result } = renderApp();
    act(() => {
      result.current.login('gestao@aliancaimoveis.com.br', '123');
    });

    let ticketId = '';
    act(() => {
      ticketId = result.current.createTicket(novoChamado).id;
    });
    act(() => {
      result.current.submitQuote(ticketId, {
        ticketId,
        serviceDescription: 'Troca do sifão',
        materialsSummary: '1x sifão',
        laborSummary: 'Mão de obra',
        materialsCost: 100,
        laborCost: 200,
        totalCost: 300,
        executionDeadlineDays: 1,
      });
    });
    act(() => {
      result.current.reviewQuote(ticketId, 'reprovar', 'Valor acima do teto contratual');
    });

    const ticket = result.current.tickets.find((t) => t.id === ticketId)!;
    expect(ticket.status).toBe('orcamento_reprovado');
    expect(ticket.quote?.status).toBe('reprovado');
    expect(ticket.quote?.rejectionReason).toBe('Valor acima do teto contratual');
    expect(ticket.quote?.rejectedAt).toBeTruthy();
    expect(ticket.quote?.approvedAt).toBeUndefined();
  });

  it('gera protocolos únicos em chamados consecutivos', () => {
    // Regressão: o protocolo derivava de `tickets.length` e repetia após um reset.
    const { result } = renderApp();
    act(() => {
      result.current.login('mariana.costa@email.com', '123');
    });

    const protocolos: string[] = [];
    act(() => {
      protocolos.push(result.current.createTicket(novoChamado).protocol);
    });
    act(() => {
      protocolos.push(result.current.createTicket(novoChamado).protocol);
    });
    act(() => {
      protocolos.push(result.current.createTicket(novoChamado).protocol);
    });

    expect(new Set(protocolos).size).toBe(3);
  });

  it('a autoria da timeline reflete quem está logado', () => {
    // Regressão: `getAuthorName()` devolvia nomes fixos, ignorando a sessão.
    const { result } = renderApp();
    act(() => {
      result.current.login('admin@casapronta.com.br', 'admin');
    });

    let ticketId = '';
    act(() => {
      ticketId = result.current.createTicket(novoChamado).id;
    });
    act(() => {
      result.current.updateTicketStatus(ticketId, 'em_analise');
    });

    const timeline = result.current.tickets.find((t) => t.id === ticketId)!.timeline;
    const ultimo = timeline[timeline.length - 1]!;
    expect(ultimo.authorName).toContain('Casa Pronta Manutenções (Central)');
  });
});

describe('agendamento', () => {
  const slotBase = {
    clientName: 'Mariana Costa',
    clientPhone: '(11) 98123-4567',
    address: 'Rua das Acácias, 450 - Apto 402',
    agencyName: 'Aliança Gestão Imobiliária',
    serviceType: 'Reparo',
    description: 'Reparo',
    technicianId: 'tech-carlos',
    technicianName: 'Carlos Santos',
    teamName: 'Equipe Hidráulica',
    date: '2099-01-15',
    priority: 'normal' as const,
  };

  it('recusa agendamento conflitante e devolve o compromisso existente', () => {
    const { result } = renderApp();
    act(() => {
      result.current.login('admin@casapronta.com.br', 'admin');
    });

    act(() => {
      const ok = result.current.scheduleAppointment({
        ...slotBase,
        startTime: '09:00',
        endTime: '11:00',
      });
      expect(ok.success).toBe(true);
    });

    act(() => {
      const conflito = result.current.scheduleAppointment({
        ...slotBase,
        startTime: '10:00',
        endTime: '12:00',
      });
      expect(conflito.success).toBe(false);
      expect(conflito.conflict?.startTime).toBe('09:00');
    });
  });

  it('aceita agendamento encostado no anterior', () => {
    const { result } = renderApp();
    act(() => {
      result.current.login('admin@casapronta.com.br', 'admin');
    });

    act(() => {
      result.current.scheduleAppointment({ ...slotBase, startTime: '09:00', endTime: '11:00' });
    });
    act(() => {
      const res = result.current.scheduleAppointment({
        ...slotBase,
        startTime: '11:00',
        endTime: '13:00',
      });
      expect(res.success).toBe(true);
    });
  });

  it('recusa janela com término anterior ao início', () => {
    const { result } = renderApp();
    act(() => {
      result.current.login('admin@casapronta.com.br', 'admin');
    });
    act(() => {
      const res = result.current.scheduleAppointment({
        ...slotBase,
        startTime: '14:00',
        endTime: '13:00',
      });
      expect(res.success).toBe(false);
    });
  });

  it('confirmação de presença sincroniza a lista global e a cópia no chamado', () => {
    // Regressão: `updateAppointmentStatus` atualizava só a lista global, e as duas divergiam.
    const { result } = renderApp();
    act(() => {
      result.current.login('admin@casapronta.com.br', 'admin');
    });

    let ticketId = '';
    act(() => {
      ticketId = result.current.createTicket(novoChamado).id;
    });

    let appointmentId = '';
    act(() => {
      const res = result.current.scheduleAppointment({
        ...slotBase,
        ticketId,
        startTime: '09:00',
        endTime: '11:00',
      });
      appointmentId = res.appointment!.id;
    });

    act(() => {
      result.current.updateAppointmentStatus(appointmentId, 'confirmado');
    });

    const naLista = result.current.appointments.find((a) => a.id === appointmentId)!;
    const noChamado = result.current.tickets.find((t) => t.id === ticketId)!.appointment!;

    expect(naLista.status).toBe('confirmado');
    expect(naLista.tenantConfirmed).toBe(true);
    expect(noChamado.status).toBe('confirmado');
    expect(noChamado.tenantConfirmed).toBe(true);
  });
});
