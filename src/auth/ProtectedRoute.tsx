import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { UserRole } from '../types';
import { useAuth } from './useAuth';
import { homePathForRole } from './portalRoutes';
import { LoadingScreen } from '../components/LoadingScreen';

interface ProtectedRouteProps {
  /** Papel exigido. Sem isto, basta estar autenticado. */
  allow?: UserRole;
  children: React.ReactNode;
}

/**
 * Barreira de rota.
 *
 * ⚠️ Isto é navegação, NÃO segurança. Quem editar o bundle chega em qualquer
 * rota. O que impede de fato o acesso a dado alheio são as políticas RLS
 * (supabase/migrations/…_rls.sql) — esta barreira só evita que um usuário caia
 * numa tela que não faz sentido para o papel dele.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allow, children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Enquanto a sessão salva é restaurada, não dá para decidir. Renderizar o
  // login aqui faria a tela piscar a cada recarregamento de quem já está logado.
  if (loading) return <LoadingScreen />;

  if (!user) {
    // Guarda o destino para voltar a ele depois do login.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Papel errado não vira erro: manda para o portal de quem é.
  if (allow && user.role !== allow) {
    return <Navigate to={homePathForRole(user.role)} replace />;
  }

  return <>{children}</>;
};
