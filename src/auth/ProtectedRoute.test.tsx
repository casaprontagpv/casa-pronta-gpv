import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AuthContext, type AuthContextValue } from './authContext';
import { ProtectedRoute } from './ProtectedRoute';
import { homePathForRole, isPublicPath, PORTAL_PATH } from './portalRoutes';
import type { AuthUser, UserRole } from '../types';

/**
 * A barreira de rota é NAVEGAÇÃO, não segurança — quem editar o bundle chega em
 * qualquer rota. O que protege o dado é a RLS. Estes testes garantem que o
 * usuário não caia numa tela que não faz sentido para o papel dele.
 */

const usuario = (role: UserRole): AuthUser => ({
  id: 'u1',
  name: 'Fulana',
  email: 'fulana@exemplo.com',
  role,
});

const auth = (over: Partial<AuthContextValue> = {}): AuthContextValue => ({
  user: null,
  loading: false,
  error: null,
  signIn: async () => ({ success: true }),
  signOut: async () => {},
  requestPasswordReset: async () => ({ success: true }),
  updatePassword: async () => ({ success: true }),
  ...over,
});

const renderRota = (value: AuthContextValue, rotaInicial = '/empresa') =>
  render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={[rotaInicial]}>
        <Routes>
          <Route path="/login" element={<div>tela de login</div>} />
          {(Object.keys(PORTAL_PATH) as UserRole[]).map((role) => (
            <Route
              key={role}
              path={PORTAL_PATH[role]}
              element={
                <ProtectedRoute allow={role}>
                  <div>portal {role}</div>
                </ProtectedRoute>
              }
            />
          ))}
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );

describe('ProtectedRoute', () => {
  it('sem sessão, manda para o login', () => {
    renderRota(auth());
    expect(screen.getByText('tela de login')).toBeInTheDocument();
  });

  it('enquanto a sessão carrega, não mostra o login', () => {
    // Renderizar o login aqui faria a tela piscar a cada recarregamento de
    // quem já está autenticado.
    renderRota(auth({ loading: true }));
    expect(screen.queryByText('tela de login')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('com o papel certo, renderiza o portal', () => {
    renderRota(auth({ user: usuario('empresa') }), '/empresa');
    expect(screen.getByText('portal empresa')).toBeInTheDocument();
  });

  it('com o papel errado, redireciona para o portal de quem é', () => {
    // O inquilino tentando a central não vê erro: vai para a área dele.
    renderRota(auth({ user: usuario('inquilino') }), '/empresa');
    expect(screen.getByText('portal inquilino')).toBeInTheDocument();
    expect(screen.queryByText('portal empresa')).not.toBeInTheDocument();
  });

  it('técnico não alcança o portal da imobiliária', () => {
    renderRota(auth({ user: usuario('prestador') }), '/imobiliaria');
    expect(screen.getByText('portal prestador')).toBeInTheDocument();
  });
});

describe('portalRoutes', () => {
  it('todo papel tem um portal', () => {
    const papeis: UserRole[] = ['inquilino', 'imobiliaria', 'empresa', 'prestador'];
    for (const role of papeis) {
      expect(homePathForRole(role)).toBe(PORTAL_PATH[role]);
      expect(homePathForRole(role)).toMatch(/^\//);
    }
  });

  it('os portais não são rotas públicas', () => {
    for (const path of Object.values(PORTAL_PATH)) {
      expect(isPublicPath(path)).toBe(false);
    }
  });

  it('login e recuperação de senha são públicos', () => {
    expect(isPublicPath('/login')).toBe(true);
    expect(isPublicPath('/recuperar-senha')).toBe(true);
    expect(isPublicPath('/nova-senha')).toBe(true);
  });
});
