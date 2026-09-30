import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

/**
 * Cliente Supabase do navegador.
 *
 * Usa a `anon key`, que é pública por design: ela apenas identifica o projeto.
 * Quem a possui não lê nada além do que as políticas RLS permitirem ao usuário
 * autenticado por trás dela — é a RLS que protege os dados, não a chave.
 *
 * A `service_role`, essa sim irrestrita, nunca chega ao navegador: vive apenas
 * na Vercel Function do painel administrativo.
 */

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Falhar aqui, na inicialização, em vez de deixar cada consulta estourar
  // depois com um erro de rede que não explica a causa.
  throw new Error(
    'VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórias. ' +
      'Copie .env.example para .env.local e preencha — ver docs/DEPLOY.md.'
  );
}

export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    // Mantém a sessão entre recarregamentos e renova o token antes de expirar.
    persistSession: true,
    autoRefreshToken: true,
    // Necessário para o link de recuperação de senha, que chega com o token no hash.
    detectSessionInUrl: true,
    storageKey: 'casapronta.auth',
  },
});

/** Tipos das tabelas, derivados do schema. Evita repetir `Database['public']['Tables']…`. */
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];
