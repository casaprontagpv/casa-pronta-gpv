import { createClient } from '@supabase/supabase-js';

/**
 * Guarda do endpoint administrativo.
 *
 * Este é o único lugar do sistema onde a `service_role` é usada — e ela IGNORA
 * toda a RLS. Um endpoint desprotegido aqui anularia, de uma vez, o isolamento
 * entre imobiliárias que a Etapa 2 construiu.
 *
 * Por isso a ordem importa: validar quem está chamando ANTES de tocar na
 * service_role. O JWT do usuário é verificado pelo próprio Supabase, e o papel
 * é lido do banco — nunca do token, que o cliente poderia ter forjado antes de
 * assinar... e nunca do corpo da requisição.
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export class ConfigError extends Error {}
export class AuthError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

const exigirConfig = () => {
  if (!SUPABASE_URL || !ANON_KEY) {
    throw new ConfigError('VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não configuradas.');
  }
  if (!SERVICE_ROLE_KEY) {
    throw new ConfigError(
      'SUPABASE_SERVICE_ROLE_KEY não configurada. Cadastre nas variáveis de ambiente do servidor — nunca com prefixo VITE_.'
    );
  }
};

/** Cliente irrestrito. Só depois de `exigirEmpresa` autorizar. */
export const adminClient = () => {
  exigirConfig();
  return createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
};

export interface Chamador {
  id: string;
  email: string;
  name: string;
}

/**
 * Autoriza a requisição: sessão válida + papel `empresa` + perfil ativo.
 * Lança `AuthError` em qualquer outro caso.
 */
export const exigirEmpresa = async (authorizationHeader: string | null): Promise<Chamador> => {
  exigirConfig();

  const token = authorizationHeader?.replace(/^Bearer\s+/i, '').trim();
  if (!token) throw new AuthError('Autenticação necessária.', 401);

  // Cliente com a ANON key + o token do usuário: a validação da assinatura e da
  // expiração é feita pelo Supabase, não por nós.
  const comoUsuario = createClient(SUPABASE_URL!, ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    // Nada de sessão: é um cliente de uma requisição só, no servidor.
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { data: auth, error: authErr } = await comoUsuario.auth.getUser();
  if (authErr || !auth.user) throw new AuthError('Sessão inválida ou expirada.', 401);

  // O papel vem do banco. Ler do token seria confiar em algo que o cliente
  // influencia no cadastro; ler do corpo da requisição seria pior ainda.
  const { data: perfil, error: perfilErr } = await comoUsuario
    .from('profiles')
    .select('id, name, email, role, active')
    .eq('id', auth.user.id)
    .maybeSingle();

  if (perfilErr) throw new AuthError('Não foi possível verificar seu perfil.', 500);
  if (!perfil) throw new AuthError('Perfil não encontrado.', 403);
  if (!perfil.active) throw new AuthError('Conta desativada.', 403);
  if (perfil.role !== 'empresa') {
    throw new AuthError('Apenas a central da Casa Pronta pode administrar usuários.', 403);
  }

  return { id: perfil.id, email: perfil.email, name: perfil.name };
};

/** Resposta JSON com os cabeçalhos certos. */
export const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      // Resposta de endpoint administrativo nunca deve ser cacheada.
      'Cache-Control': 'no-store',
    },
  });

export const erroParaResposta = (err: unknown): Response => {
  if (err instanceof AuthError) return json({ error: err.message }, err.status);
  if (err instanceof ConfigError) {
    console.error('Configuração ausente:', err.message);
    return json({ error: 'Serviço administrativo indisponível.' }, 503);
  }
  console.error('Erro inesperado no endpoint administrativo:', err);
  return json({ error: 'Erro inesperado. Tente novamente.' }, 500);
};
