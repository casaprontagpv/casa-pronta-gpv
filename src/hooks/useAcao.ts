import { useCallback, useState } from 'react';
import { DataError } from '../data/tickets';

/**
 * Executa uma ação que vai ao banco, controlando "salvando" e erro.
 *
 * Com o `localStorage` toda ação era síncrona e não falhava. Agora há ida e
 * volta, e o usuário precisa saber que está em andamento e o que deu errado —
 * repetir esse try/catch em cada modal seria ruído.
 */
export const useAcao = () => {
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const executar = useCallback(
    async (acao: () => Promise<unknown>, aoConcluir?: () => void): Promise<boolean> => {
      setErro(null);
      setSalvando(true);
      try {
        await acao();
        aoConcluir?.();
        return true;
      } catch (e) {
        setErro(e instanceof DataError ? e.message : 'Não foi possível concluir. Tente novamente.');
        return false;
      } finally {
        setSalvando(false);
      }
    },
    []
  );

  return { salvando, erro, setErro, executar };
};
