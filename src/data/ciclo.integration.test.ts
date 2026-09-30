import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { prepararIntegracao } from '../test/integracao';

/**
 * Ciclo de vida do chamado, ponta a ponta, contra o Supabase local.
 *
 * O teste antigo do `AppContext` exercitava o `localStorage`. Agora quem guarda
 * o estado é o Postgres, e o que importa é se as RPCs, a RLS e os mapeadores
 * concordam — isso não se prova com dado em memória.
 *
 * Exige `npm run db:start:app`. Sem o banco no ar a suíte avisa em alto e bom
 * som e se pula localmente; no CI, FALHA — lá o banco é garantido, e um pulo
 * silencioso reportaria "passou" sem ter verificado nada.
 */

const carregarEnv = () => {
  try {
    const conteudo = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
    for (const linha of conteudo.split('\n')) {
      const m = /^([A-Z0-9_]+)=(.*)$/.exec(linha.trim());
      if (m?.[1] && !process.env[m[1]]) process.env[m[1]] = m[2]?.replace(/^"|"$/g, '') ?? '';
    }
  } catch {
    /* a suíte se pula sozinha */
  }
};
carregarEnv();

let URL_BASE = '';
let ANON = '';
let noAr = false;

/** Cliente REST cru: o supabase-js do app guarda sessão em storage do navegador. */
const req = async (
  caminho: string,
  token: string,
  init: RequestInit = {}
): Promise<{ status: number; body: unknown }> => {
  const r = await fetch(`${URL_BASE}${caminho}`, {
    ...init,
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  const texto = await r.text();
  return { status: r.status, body: texto ? JSON.parse(texto) : null };
};

const entrar = async (email: string): Promise<string> => {
  const r = await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'senha123' }),
  });
  const d = (await r.json()) as { access_token?: string };
  if (!d.access_token) throw new Error(`Falha ao autenticar ${email}`);
  return d.access_token;
};

const rpc = (nome: string, token: string, args: Record<string, unknown>) =>
  req(`/rest/v1/rpc/${nome}`, token, { method: 'POST', body: JSON.stringify(args) });

beforeAll(async () => {
  const amb = await prepararIntegracao(carregarEnv);
  URL_BASE = amb.url;
  ANON = amb.anonKey;
  noAr = amb.disponivel;
});

describe('ciclo de vida do chamado, contra o banco', () => {
  const IMOVEL_MARIANA = 'b0000000-0000-0000-0000-000000000001';
  const TECNICO_CARLOS = 'c0000000-0000-0000-0000-000000000001';

  it('percorre abertura → parecer → orçamento → aprovação → agenda → conclusão → avaliação', async () => {
    if (!noAr) return;

    const inquilina = await entrar('mariana.costa@email.com');
    const imobiliaria = await entrar('gestao@aliancaimoveis.com.br');
    const central = await entrar('admin@casapronta.com.br');
    const tecnico = await entrar('carlos.santos@casapronta.com.br');

    // ── Abertura, pela inquilina
    const abertura = await rpc('create_ticket', inquilina, {
      p_property_id: IMOVEL_MARIANA,
      p_environment: 'Banheiro',
      p_category: 'hidraulica',
      p_description: 'Torneira pingando sem parar desde ontem.',
      p_urgency: 'alta',
      p_preferred_period: 'manha',
    });
    expect(abertura.status).toBe(200);
    const chamado = abertura.body as { id: string; protocol: string; status: string };
    expect(chamado.status).toBe('chamado_aberto');
    expect(chamado.protocol).toMatch(/^#\d+$/);

    const id = chamado.id;
    const ler = async (token: string) =>
      (
        await req(
          `/rest/v1/tickets?id=eq.${id}&select=status,urgency,assigned_technician_id`,
          token
        )
      ).body as { status: string; urgency: string; assigned_technician_id: string | null }[];

    // ── A imobiliária autoriza a vistoria
    expect(
      (
        await rpc('update_ticket_status', imobiliaria, {
          p_ticket_id: id,
          p_status: 'em_analise',
          p_description: 'Vistoria autorizada.',
        })
      ).status
    ).toBe(200);

    // ── A central designa o técnico
    expect(
      (
        await rpc('assign_technician', central, {
          p_ticket_id: id,
          p_technician_id: TECNICO_CARLOS,
        })
      ).status
    ).toBe(200);

    // ── Parecer do técnico: sobrescreve a prioridade do chamado (CLAUDE.md §5)
    expect(
      (
        await rpc('save_technical_report', tecnico, {
          p_ticket_id: id,
          p_situation_found: 'Vedação do registro gasta.',
          p_possible_cause: 'Desgaste natural.',
          p_recommended_solution: 'Troca do reparo interno.',
          p_required_materials: '1x kit reparo',
          p_needs_quote: true,
          p_needs_return: false,
          p_recommended_priority: 'emergencial',
        })
      ).status
    ).toBe(200);

    let atual = (await ler(central))[0];
    expect(atual?.status).toBe('aguardando_vistoria');
    expect(atual?.urgency).toBe('emergencial');

    // ── Orçamento
    const orcamento = await rpc('submit_quote', central, {
      p_ticket_id: id,
      p_service_description: 'Troca do reparo do registro',
      p_materials_summary: '1x kit reparo',
      p_labor_summary: 'Mão de obra hidráulica',
      p_materials_cost: 60,
      p_labor_cost: 140,
      p_execution_deadline_days: 1,
      p_notes: null,
    });
    expect(orcamento.status).toBe(200);
    const q = orcamento.body as { id: string; total_cost: string; status: string };
    // `total_cost` é coluna gerada: materiais + mão de obra, calculado pelo banco.
    expect(Number(q.total_cost)).toBe(200);
    expect(q.status).toBe('enviado');

    // ── Reprovar sem motivo é recusado
    const semMotivo = await rpc('review_quote', imobiliaria, {
      p_quote_id: q.id,
      p_approve: false,
      p_reason: '',
    });
    expect(semMotivo.status).toBeGreaterThanOrEqual(400);

    // ── Aprovação
    expect(
      (
        await rpc('review_quote', imobiliaria, {
          p_quote_id: q.id,
          p_approve: true,
          p_reason: null,
        })
      ).status
    ).toBe(200);

    atual = (await ler(central))[0];
    expect(atual?.status).toBe('orcamento_aprovado');

    // ── Agendamento numa data única por execução.
    // A constraint EXCLUDE é global: uma data fixa faria a segunda rodada do
    // teste colidir com o agendamento que a primeira deixou — o teste falharia
    // por causa de si mesmo, não do código.
    const dia = `2090-${String(1 + Math.floor(Math.random() * 12)).padStart(2, '0')}-${String(
      1 + Math.floor(Math.random() * 28)
    ).padStart(2, '0')}`;
    expect(
      (
        await rpc('schedule_appointment', central, {
          p_technician_id: TECNICO_CARLOS,
          p_starts_at: `${dia}T09:00:00-03:00`,
          p_ends_at: `${dia}T11:00:00-03:00`,
          p_ticket_id: id,
          p_service_type: 'Troca do reparo',
          p_notes: null,
        })
      ).status
    ).toBe(200);

    atual = (await ler(central))[0];
    expect(atual?.status).toBe('servico_agendado');

    // ── Sobreposição no mesmo técnico é recusada pela constraint EXCLUDE
    const conflito = await rpc('schedule_appointment', central, {
      p_technician_id: TECNICO_CARLOS,
      p_starts_at: `${dia}T10:00:00-03:00`,
      p_ends_at: `${dia}T12:00:00-03:00`,
      p_ticket_id: null,
      p_service_type: 'Sobreposto',
      p_notes: null,
    });
    expect(conflito.status).toBeGreaterThanOrEqual(400);

    // ── Execução e conclusão
    expect(
      (
        await rpc('update_ticket_status', tecnico, {
          p_ticket_id: id,
          p_status: 'em_execucao',
          p_description: null,
        })
      ).status
    ).toBe(200);

    expect(
      (
        await rpc('finalize_service', tecnico, {
          p_ticket_id: id,
          p_services_performed: 'Reparo trocado e testado.',
          p_materials_used: '1x kit reparo',
          p_warranty_months: 3,
          p_observations: '',
        })
      ).status
    ).toBe(200);

    atual = (await ler(central))[0];
    expect(atual?.status).toBe('concluido');

    // ── Aceite e avaliação da inquilina não mudam o status (regras 8 e 9)
    expect((await rpc('confirm_tenant_completion', inquilina, { p_ticket_id: id })).status).toBe(
      200
    );
    expect(
      (
        await rpc('submit_evaluation', inquilina, {
          p_ticket_id: id,
          p_rating: 5,
          p_solved: true,
          p_satisfactory: true,
          p_punctual: true,
          p_comments: 'Rápido e bem feito.',
        })
      ).status
    ).toBe(200);

    atual = (await ler(central))[0];
    expect(atual?.status).toBe('concluido');

    // ── A timeline registrou cada etapa, e é append-only
    const timeline = (
      await req(`/rest/v1/ticket_timeline?ticket_id=eq.${id}&select=title,author_role`, central)
    ).body as { title: string; author_role: string }[];
    expect(timeline.length).toBeGreaterThanOrEqual(8);

    // Autoria real: quem agiu aparece, e não um nome fixo por papel.
    const papeis = new Set(timeline.map((e) => e.author_role));
    expect(papeis.has('inquilino')).toBe(true);
    expect(papeis.has('imobiliaria')).toBe(true);
    expect(papeis.has('prestador')).toBe(true);
  }, 30_000);

  it('a inquilina NÃO consegue concluir o próprio chamado', async () => {
    if (!noAr) return;
    const inquilina = await entrar('mariana.costa@email.com');
    const lista = (await req('/rest/v1/tickets?select=id&limit=1', inquilina)).body as {
      id: string;
    }[];
    const alvo = lista[0];
    expect(alvo).toBeDefined();

    const r = await rpc('update_ticket_status', inquilina, {
      p_ticket_id: alvo!.id,
      p_status: 'concluido',
      p_description: null,
    });
    expect(r.status).toBeGreaterThanOrEqual(400);
  });

  it('a mensagem de chat sai com a autoria de quem escreveu', async () => {
    if (!noAr) return;
    const inquilina = await entrar('mariana.costa@email.com');
    const lista = (await req('/rest/v1/tickets?select=id&limit=1', inquilina)).body as {
      id: string;
    }[];
    const alvo = lista[0]!;

    const r = await rpc('post_message', inquilina, {
      p_ticket_id: alvo.id,
      p_body: 'Bom dia, alguma previsão?',
    });
    expect(r.status).toBe(200);

    const msg = r.body as { sender_name: string; sender_role: string };
    expect(msg.sender_name).toBe('Mariana Costa');
    expect(msg.sender_role).toBe('inquilino');
  });
});
