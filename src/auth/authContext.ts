import { createContext } from 'react';
import type { AuthUser } from '../types';

export interface AuthResult {
  success: boolean;
  error?: string;
}

export interface AuthContextValue {
  /** Usuário autenticado com os vínculos já resolvidos. `null` quando não há sessão. */
  user: AuthUser | null;
  /** `true` enquanto a sessão inicial é restaurada — evita piscar a tela de login. */
  loading: boolean;
  /** Erro ao carregar o perfil (conta desativada, perfil ausente). */
  error: string | null;

  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<AuthResult>;
  updatePassword: (newPassword: string) => Promise<AuthResult>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
