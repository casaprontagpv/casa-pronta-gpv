#!/usr/bin/env node
/**
 * Teste de fumaça contra PRODUÇÃO.
 *
 * Entra pela porta da frente — login, RLS, realtime e endpoint administrativo —
 * em vez de deduzir que funciona a partir do arquivo de configuração. É para
 * rodar depois de um deploy, ou sempre que algo parecer estranho no ar.
 *
 * A senha é pedida no terminal e NUNCA é exibida, gravada ou enviada a lugar
 * nenhum além do próprio Supabase. O token da sessão também não é impresso.
 *
 * Nada é criado: o endpoint administrativo é chamado com corpo vazio só para
 * ver a recusa de VALIDAÇÃO — que é a prova de que a autenticação e o papel
 * passaram antes dela.
 *
 *   npm run verificar:producao
 */
import readline from 'node:readline';
import { createClient } from '@supabase/supabase-js';

// Públicas por design: as duas já vão embutidas no bundle que o navegador baixa.
const URL_BASE = process.env.VITE_SUPABASE_URL ?? 'https://cwigtsefbiajqfxqiqaa.supabase.co';
const ANON =
  process.env.VITE_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3aWd0c2VmYmlhanFmeHFpcWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3MjMxNDMsImV4cCI6MjEwNjI5OTE0M30.w9CXBbuY-5ySpE3eTylZVQ4j16SxidaI2iO7Q_EBuqI';
const APP = process.env.APP_URL ?? 'https://casa-pronta-gpv.vercel.app';

const perguntar = (texto, oculto = false) =>
  new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });
    if (oculto) {
      process.stdout.write(texto);
      rl._writeToOutput = () => {};
    }
    rl.question(oculto ? '' : texto, (v) => {
      rl.close();
      if (oculto) process.stdout.write('\n');
      resolve(v.trim());
    });
  });

let falhas = 0;
const ok = (t, extra = '') => console.log(`  \x1b[32m✓\x1b[0m ${t}${extra ? ` — ${extra}` : ''}`);
const falha = (t, motivo) => {
  falhas++;
  console.log(`  \x1b[31m✗\x1b[0m ${t} — ${motivo}`);
};

console.log(`\nVerificando ${APP}\n  banco: ${URL_BASE}\n`);

// ── 0. Cadastro público fechado ─────────────────────────────────────────────
// Não exige sessão, e é a verificação mais importante do arquivo.
//
// `enable_signup = false` no config.toml vale só para o Supabase LOCAL — o
// `db push` envia migrations, não configuração de Auth. No projeto hospedado o
// padrão é cadastro ABERTO, e aberto ele significa que qualquer pessoa cria a
// própria conta e escolhe o papel dela, porque o papel sai dos metadados que o
// próprio cliente manda no cadastro.
const conf = await (
  await fetch(`${URL_BASE}/auth/v1/settings`, { headers: { apikey: ANON } })
).json();

if (conf.disable_signup === true) {
  ok('cadastro público', 'fechado, como o produto exige');
} else {
  falha(
    'cadastro público',
    'ABERTO — qualquer pessoa pode criar conta e escolher o próprio papel. ' +
      'Authentication → Sign In / Providers → Email → desligar "Allow new users to sign up"'
  );
}

if (conf.external?.anonymous_users === false) ok('login anônimo', 'desligado');
else falha('login anônimo', 'ligado — não há caso de uso para isso neste produto');

console.log('');

const email = (await perguntar('E-mail: ')) || 'casaprontagpv@gmail.com';
const senha = await perguntar('Senha (não aparece): ', true);
console.log('');

const cliente = createClient(URL_BASE, ANON, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ── 1. Login ────────────────────────────────────────────────────────────────
const { data: sessao, error: erroLogin } = await cliente.auth.signInWithPassword({
  email,
  password: senha,
});

if (erroLogin || !sessao.session) {
  falha('login', erroLogin?.message ?? 'sem sessão');
  console.log('\nSem sessão não dá para verificar o resto.\n');
  process.exit(1);
}
ok('login', email);
const token = sessao.session.access_token;

// ── 2. Papel do perfil ──────────────────────────────────────────────────────
const { data: perfil, error: erroPerfil } = await cliente
  .from('profiles')
  .select('name, email, role, active')
  .eq('id', sessao.user.id)
  .maybeSingle();

if (erroPerfil || !perfil) {
  falha('perfil', erroPerfil?.message ?? 'nenhum perfil para este usuário');
} else if (perfil.role !== 'empresa') {
  falha('papel', `é "${perfil.role}", deveria ser "empresa" — ver docs/PRIMEIRO-ADMIN.md passo 2`);
} else if (!perfil.active) {
  falha('perfil', 'conta marcada como inativa');
} else {
  ok('papel', `empresa · ${perfil.name}`);
}

// ── 3. Leitura sob RLS ──────────────────────────────────────────────────────
const { data: chamados, error: erroChamados } = await cliente
  .from('tickets')
  .select('id', { count: 'exact' });

if (erroChamados) falha('leitura de chamados', erroChamados.message);
else ok('leitura sob RLS', `${chamados.length} chamado(s) visível(is)`);

// ── 4. Realtime ─────────────────────────────────────────────────────────────
// Confirma que o WebSocket conecta, autentica e que o servidor aceita a
// assinatura. A entrega de evento depende de dado se movendo e é exercitada
// pelo primeiro chamado de verdade.
await cliente.realtime.setAuth(token);

const assinatura = await new Promise((resolve) => {
  const prazo = setTimeout(() => resolve('TIMEOUT'), 15000);
  const canal = cliente
    .channel(`fumaca-${crypto.randomUUID()}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_profile_id=eq.${sessao.user.id}`,
      },
      () => {}
    )
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        clearTimeout(prazo);
        resolve('SUBSCRIBED');
      }
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        clearTimeout(prazo);
        resolve(err?.message ?? status);
      }
    });
  void canal;
});

if (assinatura === 'SUBSCRIBED') ok('realtime', 'WebSocket conectado e assinatura aceita');
else falha('realtime', assinatura);

// ── 5. Endpoint administrativo ──────────────────────────────────────────────
// Corpo vazio de propósito: 400 de VALIDAÇÃO prova que a sessão foi aceita, o
// papel foi conferido no banco e a service_role está configurada no servidor.
// 401/403 seria autorização falhando; 503, configuração ausente.
const r = await fetch(`${APP}/api/admin/users`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({}),
});
const corpo = await r.json().catch(() => ({}));

if (r.status === 400) ok('endpoint administrativo', `autorizou e validou — "${corpo.error}"`);
else if (r.status === 503)
  falha('endpoint administrativo', 'SUPABASE_SERVICE_ROLE_KEY ausente na Vercel');
else falha('endpoint administrativo', `HTTP ${r.status} — ${corpo.error ?? 'sem corpo'}`);

await cliente.auth.signOut();
cliente.realtime.disconnect();

console.log(
  falhas === 0
    ? '\n\x1b[32mTudo certo.\x1b[0m\n'
    : `\n\x1b[31m${falhas} verificação(ões) falharam.\x1b[0m\n`
);
process.exit(falhas === 0 ? 0 : 1);
