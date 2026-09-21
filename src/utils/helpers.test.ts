import { describe, expect, it } from 'vitest';
import { AppointmentStatus, Category, PriorityLevel, PropertyType, TicketStatus } from '../types';
import {
  formatCurrency,
  generateWhatsAppLink,
  getAppointmentStatusConfig,
  getCategoryLabel,
  getPriorityConfig,
  getPropertyTypeLabel,
  getStatusConfig,
  normalizeText,
  sameText,
  toIsoDate,
} from './helpers';

describe('normalizeText', () => {
  it('remove acento, caixa e espaço extra', () => {
    expect(normalizeText('  Rua das ACÁCIAS,   450 ')).toBe('rua das acacias, 450');
  });

  it('trata nulo e indefinido como string vazia', () => {
    expect(normalizeText(null)).toBe('');
    expect(normalizeText(undefined)).toBe('');
  });
});

describe('sameText', () => {
  it('casa textos equivalentes', () => {
    expect(sameText('Aliança Gestão Imobiliária', 'alianca gestao imobiliaria')).toBe(true);
  });

  it('não casa textos diferentes', () => {
    expect(sameText('Rua das Acácias, 450 - Apto 402', 'Rua das Acácias, 450 - Apto 201')).toBe(
      false
    );
  });

  it('NUNCA casa quando um dos lados é vazio', () => {
    // Regra de isolamento: ausência de dado não pode virar permissão de acesso.
    expect(sameText('', '')).toBe(false);
    expect(sameText(undefined, undefined)).toBe(false);
    expect(sameText('Rua X', '')).toBe(false);
  });
});

describe('toIsoDate', () => {
  it('formata como YYYY-MM-DD usando o fuso local', () => {
    // 1º de março às 00:30 no horário local. `toISOString()` devolveria 28/02 em
    // fusos negativos como o de São Paulo — daí a função não usar UTC.
    expect(toIsoDate(new Date(2026, 2, 1, 0, 30))).toBe('2026-03-01');
  });

  it('preenche mês e dia com zero à esquerda', () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('formatCurrency', () => {
  // O Intl insere um espaço NÃO separável (U+00A0) depois de "R$".
  const NBSP = '\u00a0';

  it('formata em BRL no padrão pt-BR', () => {
    expect(formatCurrency(1234.5)).toBe(`R$${NBSP}1.234,50`);
    expect(formatCurrency(0)).toBe(`R$${NBSP}0,00`);
  });

  it('formata valores negativos', () => {
    expect(formatCurrency(-50)).toBe(`-R$${NBSP}50,00`);
  });
});

describe('generateWhatsAppLink', () => {
  it('monta o deep link com DDI 55 e texto codificado', () => {
    expect(generateWhatsAppLink('(11) 98123-4567', 'Olá & bom dia')).toBe(
      'https://wa.me/5511981234567?text=Ol%C3%A1%20%26%20bom%20dia'
    );
  });
});

describe('configurações de rótulo', () => {
  const ticketStatuses: TicketStatus[] = [
    'chamado_aberto',
    'em_analise',
    'aguardando_vistoria',
    'orcamento_enviado',
    'aguardando_aprovacao',
    'orcamento_aprovado',
    'orcamento_reprovado',
    'servico_agendado',
    'em_execucao',
    'pendente',
    'concluido',
    'cancelado',
  ];

  it.each(ticketStatuses)('todo TicketStatus tem rótulo e cor: %s', (status) => {
    const cfg = getStatusConfig(status);
    expect(cfg.label).toBeTruthy();
    expect(cfg.bg).toBeTruthy();
    expect(cfg.label).not.toBe(status);
  });

  const appointmentStatuses: AppointmentStatus[] = [
    'agendado',
    'confirmado',
    'aguardando_confirmacao',
    'em_deslocamento',
    'em_atendimento',
    'concluido',
    'reagendar',
    'cancelado',
    'nao_realizado',
  ];

  it.each(appointmentStatuses)('todo AppointmentStatus tem rótulo e cor: %s', (status) => {
    const cfg = getAppointmentStatusConfig(status);
    expect(cfg?.label).toBeTruthy();
    expect(cfg?.color).toBeTruthy();
  });

  const priorities: PriorityLevel[] = ['emergencial', 'alta', 'normal', 'baixa'];
  it.each(priorities)('todo PriorityLevel tem rótulo: %s', (priority) => {
    expect(getPriorityConfig(priority)?.label).toBeTruthy();
  });

  const categories: Category[] = [
    'eletrica',
    'hidraulica',
    'pintura',
    'infiltracao',
    'porta_fechadura',
    'janela',
    'revestimento_piso',
    'telhado',
    'outro',
  ];
  it.each(categories)('toda Category tem rótulo: %s', (category) => {
    expect(getCategoryLabel(category)).toBeTruthy();
  });

  const propertyTypes: PropertyType[] = ['apartamento', 'casa', 'sobrado', 'comercial', 'outro'];
  it.each(propertyTypes)('todo PropertyType tem rótulo: %s', (type) => {
    expect(getPropertyTypeLabel(type)).toBeTruthy();
  });
});
