import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Atualização ao vivo.
 *
 * O protótipo guardava tudo no `localStorage`: a timeline e o chat só existiam
 * na máquina de quem escreveu. Depois da migração eles passaram a ser
 * compartilhados, mas a página ainda precisava de F5 para mostrar o que o outro
 * lado tinha escrito — e um chat que exige recarregar não é um chat.
 *
 * ─── O evento é SINAL, não DADO ─────────────────────────────────────────────
 *
 * Nada aqui lê o payload do Realtime para montar estado. Ao receber um evento,
 * o cliente relê pelo caminho normal — PostgREST, com a RLS aplicada. Dois
 * motivos:
 *
 *  1. Segurança. Se algum dia a avaliação de RLS do Realtime falhar ou mudar de
 *     comportamento, o pior caso aqui é uma releitura desnecessária que não traz
 *     nada — e não uma linha alheia entrando na tela.
 *  2. Correção. A tela mostra o chamado montado a partir de oito tabelas
 *     (mappers.ts). Aplicar um `INSERT` solto de `quotes` sobre esse agregado
 *     seria recriar a lógica de montagem num segundo lugar, com liberdade para
 *     divergir.
 *
 * O custo é uma consulta a mais por evento. Numa operação com dezenas de
 * chamados simultâneos isso é irrelevante; se um dia deixar de ser, o lugar de
 * mudar é aqui, sem tocar em componente nenhum.
 */

export type EstadoConexao = 'conectando' | 'ao_vivo' | 'sem_conexao';

/** Cancela a assinatura. */
export type Cancelar = () => void;

/**
 * Uma ação do domínio grava em três ou quatro tabelas de uma vez (registro,
 * timeline, notificações) e cada gravação vira um evento. Sem agrupar, um único
 * clique do outro lado dispararia quatro releituras.
 */
const JANELA_MS = 300;

const agrupar = (fn: () => void, ms = JANELA_MS) => {
  let pendente: ReturnType<typeof setTimeout> | null = null;
  return {
    disparar: () => {
      if (pendente) clearTimeout(pendente);
      pendente = setTimeout(() => {
        pendente = null;
        fn();
      }, ms);
    },
    cancelar: () => {
      if (pendente) clearTimeout(pendente);
      pendente = null;
    },
  };
};

// Um tópico por assinatura. Reaproveitar o nome enquanto o canal anterior ainda
// está se despedindo faz o servidor tratar as duas como a mesma inscrição.
let sequencia = 0;
const topico = (nome: string) => `${nome}:${++sequencia}`;

/**
 * DELETE não é assinado de propósito: o Realtime não consegue aplicar a RLS
 * sobre uma linha que já não existe, e um evento sem filtro é o que não
 * queremos. Nada no domínio apaga registro — ver a migration 20260930020000.
 */
const EVENTOS = ['INSERT', 'UPDATE'] as const;

interface Alvo {
  table: string;
  filter?: string;
}

const montar = (nome: string, alvos: Alvo[], aoMudar: () => void): RealtimeChannel => {
  const canal = supabase.channel(topico(nome));

  for (const alvo of alvos) {
    for (const event of EVENTOS) {
      canal.on(
        'postgres_changes',
        { event, schema: 'public', table: alvo.table, ...(alvo.filter && { filter: alvo.filter }) },
        aoMudar
      );
    }
  }

  return canal;
};

/**
 * Assina o que alimenta as listas: chamados, agenda e o sininho.
 *
 * `ticket_timeline` entra porque toda RPC do domínio chama `log_timeline()` —
 * é o sinal mais confiável de que alguma coisa aconteceu em algum chamado.
 */
export const assinarListas = (
  aoMudar: () => void,
  aoMudarEstado?: (estado: EstadoConexao) => void
): Cancelar => {
  const lote = agrupar(aoMudar);

  const canal = montar(
    'listas',
    [
      { table: 'tickets' },
      { table: 'ticket_timeline' },
      { table: 'appointments' },
      { table: 'notifications' },
    ],
    lote.disparar
  );

  aoMudarEstado?.('conectando');
  canal.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      aoMudarEstado?.('ao_vivo');
      // Reconexão depois de uma queda: o que mudou nesse intervalo não chegou
      // por evento nenhum. Sem esta releitura a tela fica parada no passado
      // justamente depois de voltar a funcionar.
      lote.disparar();
      return;
    }
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
      aoMudarEstado?.('sem_conexao');
    }
  });

  return () => {
    lote.cancelar();
    void supabase.removeChannel(canal);
  };
};

/**
 * Assina o chamado aberto: timeline e chat da conversa em tela.
 *
 * O filtro por `ticket_id` é uma economia, não uma barreira — a barreira é a
 * RLS, no servidor. Sem ele, quem enxerga cem chamados releria o detalhe aberto
 * a cada mensagem trocada em qualquer um dos outros noventa e nove.
 */
export const assinarChamado = (ticketId: string, aoMudar: () => void): Cancelar => {
  const lote = agrupar(aoMudar);
  const filter = `ticket_id=eq.${ticketId}`;

  const canal = montar(
    'chamado',
    [
      { table: 'ticket_messages', filter },
      { table: 'ticket_timeline', filter },
      { table: 'tickets', filter: `id=eq.${ticketId}` },
    ],
    lote.disparar
  );

  canal.subscribe();

  return () => {
    lote.cancelar();
    void supabase.removeChannel(canal);
  };
};
