import type { Category, MaintenanceTicket } from '../types';

/**
 * Indicadores calculados a partir dos chamados que a RLS já entregou.
 *
 * Toda função devolve `null` quando não há base para calcular, em vez de zero.
 * A diferença importa na tela: "0%" afirma que nenhum orçamento foi aprovado;
 * `null` diz que ainda não houve orçamento nenhum. Número inventado é pior do
 * que indicador ausente — ele é levado a uma reunião e repetido como fato.
 *
 * O recorte é o do usuário: a imobiliária só enxerga os próprios chamados, então
 * a conta já sai limitada à carteira dela sem nenhum filtro aqui.
 */

const MS_POR_DIA = 1000 * 60 * 60 * 24;

/** Dias entre a abertura e a conclusão, em média. `null` sem chamado concluído. */
export const tempoMedioAtendimentoDias = (
  tickets: MaintenanceTicket[]
): { dias: number; base: number } | null => {
  const duracoes = tickets
    .filter((t) => t.completion?.completedAtIso && t.createdAtIso)
    .map(
      (t) => new Date(t.completion!.completedAtIso).getTime() - new Date(t.createdAtIso).getTime()
    )
    .filter((ms) => Number.isFinite(ms) && ms >= 0);

  if (duracoes.length === 0) return null;

  const media = duracoes.reduce((a, b) => a + b, 0) / duracoes.length / MS_POR_DIA;
  return { dias: Math.round(media * 10) / 10, base: duracoes.length };
};

/**
 * Percentual de orçamentos aprovados entre os já DECIDIDOS.
 *
 * Orçamento ainda em análise não entra no denominador: contá-lo como reprovado
 * faria a taxa cair sozinha enquanto a imobiliária não responde.
 */
export const taxaAprovacaoOrcamentos = (
  tickets: MaintenanceTicket[]
): { percentual: number; base: number } | null => {
  const decididos = tickets
    .map((t) => t.quote?.status)
    .filter((s): s is 'aprovado' | 'reprovado' => s === 'aprovado' || s === 'reprovado');

  if (decididos.length === 0) return null;

  const aprovados = decididos.filter((s) => s === 'aprovado').length;
  return {
    percentual: Math.round((aprovados / decididos.length) * 1000) / 10,
    base: decididos.length,
  };
};

/** Média das notas de 1 a 5. `null` sem nenhuma avaliação. */
export const csat = (tickets: MaintenanceTicket[]): { media: number; base: number } | null => {
  const notas = tickets
    .map((t) => t.evaluation?.rating)
    .filter((n): n is number => typeof n === 'number');

  if (notas.length === 0) return null;

  const media = notas.reduce((a, b) => a + b, 0) / notas.length;
  return { media: Math.round(media * 10) / 10, base: notas.length };
};

export interface FatiaCategoria {
  categoria: Category;
  quantidade: number;
  percentual: number;
}

/** Distribuição por categoria, da mais frequente para a menos. */
export const distribuicaoPorCategoria = (tickets: MaintenanceTicket[]): FatiaCategoria[] => {
  if (tickets.length === 0) return [];

  const contagem = new Map<Category, number>();
  for (const t of tickets) contagem.set(t.category, (contagem.get(t.category) ?? 0) + 1);

  return [...contagem.entries()]
    .map(([categoria, quantidade]) => ({
      categoria,
      quantidade,
      percentual: Math.round((quantidade / tickets.length) * 1000) / 10,
    }))
    .sort((a, b) => b.quantidade - a.quantidade);
};
