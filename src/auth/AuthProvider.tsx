import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { AuthUser } from '../types';
import { AuthContext, type AuthContextValue, type AuthResult } from './authContext';
import { loadSessionUser } from './loadSession';

/**
 * Sessão do Supabase Auth traduzida para o usuário de domínio.
 *
 * Substitui o `login()` de demonstração, que casava identificador contra uma
 * lista em `mockUsers.ts` e aceitava as senhas universais `123` e `admin`.
 */

/**
 * Traduz o erro do GoTrue para português, sem revelar se o e-mail existe.
 *
 * Distinguir "usuário não encontrado" de "senha errada" entrega uma lista de
 * e-mails válidos a quem estiver tentando adivinhar.
 */
const mensagemDeErro = (message: string): string => {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'E-mail ou senha inválidos.';
  if (m.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar.';
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.';
  if (m.includes('should be at least')) return 'A senha precisa ter ao menos 8 caracteres.';
  if (m.includes('new password should be different'))
    return 'A nova senha precisa ser diferente da atual.';
  return 'Não foi possível concluir. Tente novamente em instantes.';
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Evita aplicar o resultado de um carregamento que já foi superado por outro
  // evento de auth (troca rápida de sessão, logout durante o fetch).
  const carregamentoAtual = useRef(0);

  const carregarPerfil = useCallback(async (userId: string | null) => {
    const geracao = ++carregamentoAtual.current;

    if (!userId) {
      setUser(null);
      setError(null);
      setLoading(false);
      return;
    }

    try {
      const perfil = await loadSessionUser(userId);
      if (geracao !== carregamentoAtual.current) return;
      setUser(perfil);
      setError(null);
    } catch (err) {
      if (geracao !== carregamentoAtual.current) return;
      // Conta desativada ou sem perfil: encerra a sessão para não deixar o
      // usuário preso numa tela vazia sem entender o motivo.
      setUser(null);
      setError(err instanceof Error ? err.message : 'Não foi possível carregar seu perfil.');
      await supabase.auth.signOut();
    } finally {
      if (geracao === carregamentoAtual.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ativo = true;

    // Restaura a sessão salva antes de decidir o que renderizar.
    supabase.auth.getSession().then(({ data }) => {
      if (!ativo) return;
      void carregarPerfil(data.session?.user.id ?? null);
    });

    // Cobre login, logout, refresh de token e o retorno do link de recuperação.
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (!ativo) return;

      // TOKEN_REFRESHED não muda quem está logado; recarregar o perfil a cada
      // renovação seria uma consulta a cada hora, sem motivo.
      if (event === 'TOKEN_REFRESHED') return;

      void carregarPerfil(session?.user.id ?? null);
    });

    return () => {
      ativo = false;
      subscription.subscription.unsubscribe();
    };
  }, [carregarPerfil]);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    setError(null);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (authError) return { success: false, error: mensagemDeErro(authError.message) };

    // `onAuthStateChange` assume daqui: carrega o perfil e preenche `user`.
    return { success: true };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setError(null);
  }, []);

  const requestPasswordReset = useCallback(async (email: string): Promise<AuthResult> => {
    const { error: authError } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: `${window.location.origin}/nova-senha` }
    );

    // Sucesso mesmo quando o e-mail não existe: responder diferente revelaria
    // quais endereços têm conta.
    if (authError && !authError.message.toLowerCase().includes('rate limit')) {
      return { success: true };
    }
    if (authError) return { success: false, error: mensagemDeErro(authError.message) };
    return { success: true };
  }, []);

  const updatePassword = useCallback(async (newPassword: string): Promise<AuthResult> => {
    const { error: authError } = await supabase.auth.updateUser({ password: newPassword });
    if (authError) return { success: false, error: mensagemDeErro(authError.message) };
    return { success: true };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, error, signIn, signOut, requestPasswordReset, updatePassword }),
    [user, loading, error, signIn, signOut, requestPasswordReset, updatePassword]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
