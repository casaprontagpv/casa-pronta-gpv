import { useContext } from 'react';
import { AppContext, type AppContextType } from './appContextTypes';

/**
 * Acessa o estado e as ações de domínio.
 *
 * Fica em arquivo próprio para que `AppContext.tsx` exporte apenas o componente
 * `AppProvider` — requisito do Fast Refresh do Vite.
 */
export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp precisa ser usado dentro de um AppProvider');
  }
  return context;
};
