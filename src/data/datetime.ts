/**
 * Conversão entre o `timestamptz` do banco e o que a interface usa.
 *
 * O banco guarda instantes absolutos. A interface trabalha com data `YYYY-MM-DD`
 * e hora `HH:MM` no fuso de São Paulo, e exibe datas no formato pt-BR.
 *
 * O protótipo gravava a data já formatada ("14/09/2025 às 13:26"), o que
 * impedia ordenar e calcular. Aqui a formatação é só de saída.
 */

export const FUSO = 'America/Sao_Paulo';

/** `2026-09-21T12:00:00Z` → `21/09/2026 às 09:00` */
export const formatarDataHora = (iso: string): string => {
  const d = new Date(iso);
  const data = d.toLocaleDateString('pt-BR', { timeZone: FUSO });
  const hora = d.toLocaleTimeString('pt-BR', {
    timeZone: FUSO,
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${data} às ${hora}`;
};

/** `2026-09-21T12:00:00Z` → `21/09/2026` */
export const formatarData = (iso: string): string =>
  new Date(iso).toLocaleDateString('pt-BR', { timeZone: FUSO });

/** Data no fuso de São Paulo, em ISO curto: `2026-09-21`. */
export const dataLocal = (iso: string): string => {
  // `en-CA` produz YYYY-MM-DD, que é o formato do `<input type="date">`.
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: FUSO });
};

/** Hora no fuso de São Paulo: `09:00`. */
export const horaLocal = (iso: string): string =>
  new Date(iso).toLocaleTimeString('pt-BR', {
    timeZone: FUSO,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

/**
 * Junta data e hora locais num instante absoluto.
 *
 * O deslocamento de São Paulo é fixo em -03:00 desde 2019, quando o horário de
 * verão foi extinto. Se ele voltar, esta função precisa passar a consultar o
 * fuso de verdade — daí o comentário, e não um número solto no meio do código.
 */
export const paraInstante = (data: string, hora: string): string => {
  const [h = '00', m = '00'] = hora.split(':');
  return `${data}T${h.padStart(2, '0')}:${m.padStart(2, '0')}:00-03:00`;
};
