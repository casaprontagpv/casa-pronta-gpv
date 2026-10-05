import { describe, expect, it } from 'vitest';
import {
  csat,
  distribuicaoPorCategoria,
  taxaAprovacaoOrcamentos,
  tempoMedioAtendimentoDias,
} from './metricas';
import type { MaintenanceTicket } from '../types';

/**
 * O que estas asserções protegem: a aba de indicadores da imobiliária mostrava
 * números fixos no código (1.8 dias, 92.4%, 4.9★) que não vinham de dado nenhum.
 * Agora vêm — e a regra mais importante é a de NÃO mostrar nada quando não há
 * base, em vez de mostrar zero.
 */

const chamado = (p: Partial<MaintenanceTicket>): MaintenanceTicket =>
  ({
    id: 'x',
    category: 'hidraulica',
    createdAtIso: '2026-01-01T12:00:00Z',
    ...p,
  }) as MaintenanceTicket;

describe('tempo médio de atendimento', () => {
  it('é nulo sem nenhum chamado concluído — não zero', () => {
    expect(tempoMedioAtendimentoDias([])).toBeNull();
    expect(tempoMedioAtendimentoDias([chamado({})])).toBeNull();
  });

  it('calcula a média em dias e informa sobre quantos chamados', () => {
    const r = tempoMedioAtendimentoDias([
      // 2 dias
      chamado({
        createdAtIso: '2026-01-01T12:00:00Z',
        completion: { completedAtIso: '2026-01-03T12:00:00Z' } as MaintenanceTicket['completion'],
      }),
      // 4 dias
      chamado({
        createdAtIso: '2026-01-01T12:00:00Z',
        completion: { completedAtIso: '2026-01-05T12:00:00Z' } as MaintenanceTicket['completion'],
      }),
      // sem conclusão: fora da conta
      chamado({}),
    ]);
    expect(r).toEqual({ dias: 3, base: 2 });
  });
});

describe('taxa de aprovação de orçamentos', () => {
  it('é nula quando nenhum orçamento foi decidido', () => {
    expect(taxaAprovacaoOrcamentos([])).toBeNull();
    expect(
      taxaAprovacaoOrcamentos([
        chamado({ quote: { status: 'enviado' } as MaintenanceTicket['quote'] }),
      ])
    ).toBeNull();
  });

  it('ignora o que ainda está em análise, em vez de contar como reprovado', () => {
    const r = taxaAprovacaoOrcamentos([
      chamado({ quote: { status: 'aprovado' } as MaintenanceTicket['quote'] }),
      chamado({ quote: { status: 'reprovado' } as MaintenanceTicket['quote'] }),
      chamado({ quote: { status: 'enviado' } as MaintenanceTicket['quote'] }),
    ]);
    // 1 de 2 decididos — e não 1 de 3, que puniria a imobiliária por não ter respondido.
    expect(r).toEqual({ percentual: 50, base: 2 });
  });
});

describe('CSAT', () => {
  it('é nulo sem avaliação', () => {
    expect(csat([chamado({})])).toBeNull();
  });

  it('é a média das notas, com a base explícita', () => {
    const r = csat([
      chamado({ evaluation: { rating: 5 } as MaintenanceTicket['evaluation'] }),
      chamado({ evaluation: { rating: 4 } as MaintenanceTicket['evaluation'] }),
    ]);
    expect(r).toEqual({ media: 4.5, base: 2 });
  });
});

describe('distribuição por categoria', () => {
  it('é vazia sem chamado', () => {
    expect(distribuicaoPorCategoria([])).toEqual([]);
  });

  it('ordena da categoria mais frequente para a menos', () => {
    const r = distribuicaoPorCategoria([
      chamado({ category: 'hidraulica' }),
      chamado({ category: 'hidraulica' }),
      chamado({ category: 'eletrica' }),
      chamado({ category: 'telhado' }),
    ]);
    expect(r.map((f) => f.categoria)).toEqual(['hidraulica', 'eletrica', 'telhado']);
    expect(r[0]).toEqual({ categoria: 'hidraulica', quantidade: 2, percentual: 50 });
  });

  it('os percentuais somam 100 quando não há arredondamento problemático', () => {
    const r = distribuicaoPorCategoria([
      chamado({ category: 'hidraulica' }),
      chamado({ category: 'eletrica' }),
      chamado({ category: 'pintura' }),
      chamado({ category: 'telhado' }),
    ]);
    expect(r.reduce((a, f) => a + f.percentual, 0)).toBe(100);
  });
});
