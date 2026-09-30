import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { prepararIntegracao } from '../../src/test/integracao';

/**
 * Autorização do endpoint administrativo, contra o Supabase local.
 *
 * É o teste mais importante desta etapa. O endpoint usa a `service_role`, que
 * ignora a RLS — se ele aceitar quem não é a central, todo o isolamento entre
 * imobiliárias deixa de valer com um único POST.
 *
 * Exige `npm run db:start:app`. Sem o banco no ar a suíte avisa e se pula
 * localmente; no CI, FALHA — um pulo silencioso reportaria "passou" sem ter
 * verificado a autorização.
 */

const carregarEnvLocal = () => {
  try {
    const conteudo = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
    for (const linha of conteudo.split('\n')) {
      const m = /^([A-Z0-9_]+)=(.*)$/.exec(linha.trim());
      if (m?.[1] && !process.env[m[1]]) process.env[m[1]] = m[2]?.replace(/^"|"$/g, '') ?? '';
    }
  } catch {
    // Sem .env.local: a suíte se pula sozinha logo abaixo.
  }
};

let URL_BASE = '';
let ANON = '';
let bancoNoAr = false;

const token = async (email: string, senha = 'senha123'): Promise<string> => {
  const r = await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: senha }),
  });
  const d = (await r.json()) as { access_token?: string };
  if (!d.access_token) throw new Error(`Falha ao autenticar ${email}`);
  return d.access_token;
};

const pedirCriacao = async (autorizacao: string | null, corpo: unknown): Promise<Response> => {
  // Importado dentro da função: o módulo lê process.env na carga, e as variáveis
  // só existem depois de `carregarEnvLocal`.
  const { handleCreateUser } = await import('./createUser');
  return handleCreateUser(
    new Request('http://local/api/admin/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(autorizacao ? { authorization: autorizacao } : {}),
      },
      body: JSON.stringify(corpo),
    })
  );
};

beforeAll(async () => {
  const amb = await prepararIntegracao(carregarEnvLocal);
  URL_BASE = amb.url;
  ANON = amb.anonKey;
  bancoNoAr = amb.disponivel;

  // A service_role local é fixa e conhecida; em produção vem da Vercel.
  if (bancoNoAr && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { execSync } = await import('node:child_process');
    const saida = execSync('npx supabase status -o env', { encoding: 'utf8' });
    const m = /SERVICE_ROLE_KEY="?([^"\n]+)"?/.exec(saida);
    if (m?.[1]) process.env.SUPABASE_SERVICE_ROLE_KEY = m[1];
  }
});

describe('autorização do endpoint administrativo', () => {
  const novo = () => ({
    name: 'Teste Automatizado',
    email: `teste-${crypto.randomUUID()}@exemplo.com`,
    role: 'inquilino' as const,
  });

  it('recusa requisição SEM token', async () => {
    if (!bancoNoAr) return;
    const r = await pedirCriacao(null, novo());
    expect(r.status).toBe(401);
  });

  it('recusa token inventado', async () => {
    if (!bancoNoAr) return;
    const r = await pedirCriacao('Bearer nao-e-um-jwt', novo());
    expect(r.status).toBe(401);
  });

  it('recusa INQUILINO autenticado', async () => {
    if (!bancoNoAr) return;
    // Sessão legítima, papel errado: 403. É o caso que mais importa — um usuário
    // comum não pode fabricar contas.
    const r = await pedirCriacao(`Bearer ${await token('mariana.costa@email.com')}`, novo());
    expect(r.status).toBe(403);
  });

  it('recusa IMOBILIÁRIA autenticada', async () => {
    if (!bancoNoAr) return;
    const r = await pedirCriacao(`Bearer ${await token('gestao@aliancaimoveis.com.br')}`, novo());
    expect(r.status).toBe(403);
  });

  it('recusa TÉCNICO autenticado', async () => {
    if (!bancoNoAr) return;
    const r = await pedirCriacao(
      `Bearer ${await token('carlos.santos@casapronta.com.br')}`,
      novo()
    );
    expect(r.status).toBe(403);
  });

  it('aceita a CENTRAL e devolve senha temporária', async () => {
    if (!bancoNoAr) return;
    const r = await pedirCriacao(`Bearer ${await token('admin@casapronta.com.br')}`, novo());
    expect(r.status).toBe(201);

    const corpo = (await r.json()) as { userId?: string; temporaryPassword?: string };
    expect(corpo.userId).toBeTruthy();
    expect(corpo.temporaryPassword).toHaveLength(14);
  });

  it('a central NÃO consegue criar com papel inválido', async () => {
    if (!bancoNoAr) return;
    const r = await pedirCriacao(`Bearer ${await token('admin@casapronta.com.br')}`, {
      ...novo(),
      role: 'superadmin',
    });
    expect(r.status).toBe(400);
  });

  it('recusa e-mail já cadastrado', async () => {
    if (!bancoNoAr) return;
    const r = await pedirCriacao(`Bearer ${await token('admin@casapronta.com.br')}`, {
      ...novo(),
      email: 'mariana.costa@email.com',
    });
    expect(r.status).toBe(400);
  });

  it('recusa método diferente de POST', async () => {
    if (!bancoNoAr) return;
    const { handleCreateUser } = await import('./createUser');
    const r = await handleCreateUser(new Request('http://local/api/admin/users'));
    expect(r.status).toBe(405);
  });
});
