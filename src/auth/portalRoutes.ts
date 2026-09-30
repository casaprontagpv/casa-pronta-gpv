import type { UserRole } from '../types';

/**
 * Onde cada papel vive.
 *
 * No protótipo o portal vinha de uma aba escolhida à mão no cabeçalho, e o
 * `App.tsx` só conferia se `currentUser.role === activePortalTab`. Isso era
 * ferramenta de demonstração, não navegação: qualquer um trocava de aba.
 * Agora o portal é DERIVADO do papel — não há escolha a fazer.
 */
export const PORTAL_PATH: Record<UserRole, string> = {
  inquilino: '/inquilino',
  imobiliaria: '/imobiliaria',
  empresa: '/empresa',
  prestador: '/prestador',
};

/** Rota inicial do usuário após o login. */
export const homePathForRole = (role: UserRole): string => PORTAL_PATH[role];

/** Rotas que não exigem sessão. */
export const PUBLIC_PATHS = ['/login', '/recuperar-senha', '/nova-senha'] as const;

export const isPublicPath = (pathname: string): boolean =>
  PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
