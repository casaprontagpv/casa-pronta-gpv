import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { prepararIntegracao } from '../test/integracao';

/**
 * Realtime contra o Supabase local.
 *
 * A pergunta que esta suíte responde não é "o evento chega?" — é "o evento
 * chega SÓ para quem pode ver a linha?". O Realtime abre um segundo caminho
 * para os dados saírem do banco, paralelo ao PostgREST. Se a RLS não valesse
 * nele, todo o isolamento do CLAUDE.md §6 teria uma porta dos fundos: bastaria
 * assinar `ticket_messages` para acompanhar a conversa do vizinho em tempo
 * real, sem nunca fazer um SELECT.
 *
 * Cada teste abre o próprio chamado, em vez de reaproveitar o do seed. Um
 * chamado fixo faria a segunda rodada começar num status diferente da primeira
 * — foi assim que a suíte de agenda passou a falhar sozinha no segundo `npm
 * run test`.
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

let URL_BASE = '';
let ANON = '';
let noAr = false;

/** Imóvel da Mariana (Apto 402), do seed. */
const IMOVEL_MARIANA = 'b0000000-0000-0000-0000-000000000001';

const entrar = async (email: string): Promise<SupabaseClient> => {
  const cliente = createClient(URL_BASE, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await cliente.auth.signInWithPassword({ email, password: 'senha123' });
  if (error || !data.session) throw new Error(`Falha ao autenticar ${email}: ${error?.message}`);

  // O WebSocket não carrega o cabeçalho Authorization: o token vai por aqui.
  // Sem isto o assinante seria `anon`, que não enxerga nada — e os testes de
  // isolamento passariam por motivo errado, com ninguém autenticado.
  await cliente.realtime.setAuth(data.session.access_token);
  return cliente;
};

const abrirChamado = async (inquilina: SupabaseClient): Promise<string> => {
  const { data, error } = await inquilina.rpc('create_ticket', {
    p_property_id: IMOVEL_MARIANA,
    p_environment: 'Banheiro',
    p_category: 'hidraulica',
    p_description: 'Chamado de verificação do realtime.',
    p_urgency: 'normal',
    p_preferred_period: 'manha',
  });
  if (error) throw new Error(`Falha ao abrir chamado: ${error.message}`);
  return (data as { id: string }).id;
};

interface Espiao {
  eventos: unknown[];
  canal: RealtimeChannel;
}

/** Assina uma tabela e guarda o que chegar. Resolve quando o servidor confirma. */
const espiar = async (
  cliente: SupabaseClient,
  table: string,
  filter: string,
  rotulo: string
): Promise<Espiao> => {
  const eventos: unknown[] = [];
  const canal = cliente
    .channel(`espiao-${rotulo}-${crypto.randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table, filter }, (p) =>
      eventos.push(p)
    );

  await new Promise<void>((ok, falha) => {
    const prazo = setTimeout(() => falha(new Error(`assinatura de ${table} não confirmou`)), 15000);
    canal.subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        clearTimeout(prazo);
        ok();
      }
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        clearTimeout(prazo);
        falha(err ?? new Error(status));
      }
    });
  });

  return { eventos, canal };
};

const ate = async (condicao: () => boolean, ms = 10000): Promise<boolean> => {
  const limite = Date.now() + ms;
  while (Date.now() < limite) {
    if (condicao()) return true;
    await new Promise((r) => setTimeout(r, 100));
  }
  return condicao();
};

const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Conexão WebSocket viva segura o processo do Vitest depois do último teste. */
const abertos: { cliente: SupabaseClient; canal?: RealtimeChannel }[] = [];
const registrar = (cliente: SupabaseClient, canal?: RealtimeChannel) => {
  abertos.push({ cliente, canal });
};

/**
 * Espera o Realtime começar a entregar de verdade.
 *
 * Um `supabase db reset` reinicia os containers, e o Realtime leva alguns
 * segundos até acoplar no WAL do Postgres. Nesse intervalo ele já responde
 * `SUBSCRIBED` — mas o que for escrito se perde, porque evento não fica em fila.
 * Sem esta espera, o PRIMEIRO teste do arquivo falhava depois de um reset e
 * passava em todas as rodadas seguintes: exatamente o tipo de intermitência que
 * ensina a equipe a rodar de novo em vez de ler o erro.
 *
 * Isto aquece o caminho; não afrouxa asserção nenhuma. Se nem assim vier evento,
 * a falha é real e precisa ser alta.
 */
const aquecer = async (): Promise<void> => {
  const mariana = await entrar('mariana.costa@email.com');
  try {
    const chamado = await abrirChamado(mariana);
    const espiao = await espiar(
      mariana,
      'ticket_messages',
      `ticket_id=eq.${chamado}`,
      'aquecimento'
    );

    for (let tentativa = 1; tentativa <= 8; tentativa++) {
      await mariana.rpc('post_message', {
        p_ticket_id: chamado,
        p_body: `aquecimento ${tentativa}`,
      });
      if (await ate(() => espiao.eventos.length > 0, 2000)) {
        await mariana.removeChannel(espiao.canal);
        return;
      }
    }

    await mariana.removeChannel(espiao.canal);
    throw new Error(
      'O Realtime aceitou a assinatura mas não entregou nenhum evento em ~16s. ' +
        'Verifique se a migration 20260930020000_realtime.sql foi aplicada ' +
        '(a tabela precisa estar na publicação supabase_realtime).'
    );
  } finally {
    mariana.realtime.disconnect();
  }
};

beforeAll(async () => {
  const amb = await prepararIntegracao(carregarEnv);
  URL_BASE = amb.url;
  ANON = amb.anonKey;
  noAr = amb.disponivel;

  if (noAr) await aquecer();
}, 60000);

afterEach(async () => {
  for (const { cliente, canal } of abertos.splice(0)) {
    if (canal) await cliente.removeChannel(canal);
    cliente.realtime.disconnect();
  }
});

describe('realtime', () => {
  it('o chat chega ao vivo para quem enxerga o chamado — e não chega para o vizinho', async () => {
    if (!noAr) return;

    const mariana = await entrar('mariana.costa@email.com');
    // André mora no Apto 201 do mesmo prédio. É o vizinho que o protótipo
    // deixava enxergar, por comparar endereço com includes().
    const andre = await entrar('andre.siqueira@email.com');
    const central = await entrar('admin@casapronta.com.br');
    const chamado = await abrirChamado(mariana);

    const filtro = `ticket_id=eq.${chamado}`;
    const dela = await espiar(mariana, 'ticket_messages', filtro, 'm');
    const dele = await espiar(andre, 'ticket_messages', filtro, 'a');
    const daCentral = await espiar(central, 'ticket_messages', filtro, 'c');
    registrar(mariana, dela.canal);
    registrar(andre, dele.canal);
    registrar(central, daCentral.canal);

    const { error } = await central.rpc('post_message', {
      p_ticket_id: chamado,
      p_body: 'Bom dia! Já estamos analisando o seu chamado.',
    });
    expect(error).toBeNull();

    expect(await ate(() => dela.eventos.length > 0)).toBe(true);
    // Quem escreveu também recebe: é o que mantém duas abas do mesmo operador
    // coerentes entre si.
    expect(await ate(() => daCentral.eventos.length > 0)).toBe(true);

    // Margem para um evento atrasado do André aparecer, se fosse aparecer.
    await pausa(1500);
    expect(dele.eventos).toHaveLength(0);
  }, 40000);

  it('a timeline chega ao vivo, e a RLS vale nela também', async () => {
    if (!noAr) return;

    const mariana = await entrar('mariana.costa@email.com');
    const andre = await entrar('andre.siqueira@email.com');
    const central = await entrar('admin@casapronta.com.br');
    const chamado = await abrirChamado(mariana);

    const filtro = `ticket_id=eq.${chamado}`;
    const dela = await espiar(mariana, 'ticket_timeline', filtro, 'm');
    const dele = await espiar(andre, 'ticket_timeline', filtro, 'a');
    registrar(mariana, dela.canal);
    registrar(andre, dele.canal);
    registrar(central);

    const { error } = await central.rpc('update_ticket_status', {
      p_ticket_id: chamado,
      p_status: 'em_analise',
      p_description: 'Chamado recebido pela central.',
    });
    expect(error).toBeNull();

    expect(await ate(() => dela.eventos.length > 0)).toBe(true);

    await pausa(1500);
    expect(dele.eventos).toHaveLength(0);
  }, 40000);

  it('o módulo que o app usa avisa a tela — na conexão e a cada mensagem', async () => {
    if (!noAr) return;

    // Até aqui os testes montaram canais na mão. Este exercita o caminho real:
    // o cliente singleton do app e as funções que o AppContext chama. É o que
    // pega erro de configuração do canal — oito bindings numa assinatura só.
    const { supabase } = await import('../lib/supabase');
    const { assinarChamado, assinarListas } = await import('./realtime');

    const { error: erroLogin } = await supabase.auth.signInWithPassword({
      email: 'mariana.costa@email.com',
      password: 'senha123',
    });
    expect(erroLogin).toBeNull();

    const central = await entrar('admin@casapronta.com.br');
    registrar(central);

    const chamado = await abrirChamado(supabase);

    let avisosDeLista = 0;
    let estado = '';
    const pararListas = assinarListas(
      () => avisosDeLista++,
      (e) => (estado = e)
    );

    let avisosDoChamado = 0;
    const pararChamado = assinarChamado(chamado, () => avisosDoChamado++);

    try {
      // Ao conectar, o módulo relê sozinho: é o que recupera o que mudou
      // enquanto a conexão esteve caída.
      expect(await ate(() => avisosDeLista > 0)).toBe(true);
      expect(estado).toBe('ao_vivo');

      const { error } = await central.rpc('post_message', {
        p_ticket_id: chamado,
        p_body: 'Técnico a caminho.',
      });
      expect(error).toBeNull();

      expect(await ate(() => avisosDoChamado > 0)).toBe(true);
    } finally {
      pararChamado();
      pararListas();
      await supabase.auth.signOut();
      supabase.realtime.disconnect();
    }
  }, 40000);

  it('a caixa de notificações é estritamente pessoal, inclusive ao vivo', async () => {
    if (!noAr) return;

    const mariana = await entrar('mariana.costa@email.com');
    const andre = await entrar('andre.siqueira@email.com');
    const central = await entrar('admin@casapronta.com.br');
    const chamado = await abrirChamado(mariana);

    const { data: sessao } = await mariana.auth.getUser();
    const idMariana = sessao.user?.id ?? '';
    expect(idMariana).not.toBe('');

    // O André assina a caixa DA MARIANA, explicitamente. É a tentativa direta:
    // conhecer o id de alguém não pode virar acesso à correspondência dela.
    const filtro = `recipient_profile_id=eq.${idMariana}`;
    const dele = await espiar(andre, 'notifications', filtro, 'a');
    const dela = await espiar(mariana, 'notifications', filtro, 'm');
    registrar(mariana, dela.canal);
    registrar(andre, dele.canal);
    registrar(central);

    const { error } = await central.rpc('update_ticket_status', {
      p_ticket_id: chamado,
      p_status: 'em_analise',
      p_description: 'Chamado recebido pela central.',
    });
    expect(error).toBeNull();

    expect(await ate(() => dela.eventos.length > 0)).toBe(true);

    await pausa(1500);
    expect(dele.eventos).toHaveLength(0);
  }, 40000);
});
