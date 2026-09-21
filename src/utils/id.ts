/**
 * Gera identificadores únicos para as entidades de domínio.
 *
 * Os IDs eram `` `${prefixo}-${Date.now()}` ``, o que colide sempre que duas entidades
 * nascem no mesmo milissegundo — cenário comum, porque uma única ação cria registro,
 * evento de timeline e notificação de uma vez. O resultado eram `key` duplicadas no
 * React e eventos de timeline indistinguíveis.
 *
 * Prefixos em uso: `t-` (chamado), `tl-` (timeline), `msg-` (chat), `rep-` (parecer),
 * `qt-` (orçamento), `apt-` (agendamento), `comp-` (conclusão), `eval-` (avaliação),
 * `notif-` (notificação).
 *
 * Na Etapa 2 estes IDs passam a ser `uuid` gerados pelo Postgres.
 */
let counter = 0;

export const createId = (prefix: string): string => {
  counter += 1;
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now()}-${counter}${random}`;
};
