/**
 * Guarda das suítes de integração.
 *
 * Uma suíte que se pula em silêncio é pior do que não existir: ela reporta
 * "passou" sem ter verificado nada. Aqui o pulo é sempre anunciado, e no CI —
 * onde o banco é garantido — a ausência dele FALHA em vez de passar batido.
 */

export interface AmbienteIntegracao {
  url: string;
  anonKey: string;
  /** `false` quando o banco local não respondeu. */
  disponivel: boolean;
}

const ehCI = process.env.CI === 'true' || process.env.CI === '1';

export const prepararIntegracao = async (carregarEnv: () => void): Promise<AmbienteIntegracao> => {
  carregarEnv();

  const url = process.env.VITE_SUPABASE_URL ?? '';
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? '';
  const ehLocal = url.includes('127.0.0.1') || url.includes('localhost');

  let disponivel = false;
  if (ehLocal && anonKey) {
    try {
      disponivel = (await fetch(`${url}/auth/v1/health`)).ok;
    } catch {
      disponivel = false;
    }
  }

  if (!disponivel) {
    const aviso =
      'Supabase local indisponível (perfil APP). Rode `npm run db:start:app` para exercitar as suítes de integração.';
    if (ehCI) {
      throw new Error(`[integração] ${aviso}`);
    }
    console.warn(`\n⚠️  [integração] PULADA — ${aviso}\n`);
  }

  return { url, anonKey, disponivel };
};
