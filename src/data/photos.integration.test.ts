import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { prepararIntegracao } from '../test/integracao';

/**
 * Fotos no Storage, contra o Supabase local.
 *
 * O que importa aqui é o isolamento: o bucket é privado e o acesso segue a
 * visibilidade do chamado. Se essa política estiver frouxa, as fotos do interior
 * da casa de alguém ficam disponíveis a quem tiver o caminho.
 *
 * A redução da imagem não é testada aqui: `createImageBitmap` e `canvas` são do
 * navegador, e um mock deles provaria só que o mock funciona.
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

/** JPEG mínimo válido: o bucket recusa tipos fora da lista permitida. */
const jpegFalso = () =>
  new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])], {
    type: 'image/jpeg',
  });

const subir = (caminho: string, token: string) =>
  fetch(`${URL_BASE}/storage/v1/object/ticket-photos/${caminho}`, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: `Bearer ${token}`, 'Content-Type': 'image/jpeg' },
    body: jpegFalso(),
  });

const baixar = (caminho: string, token?: string) =>
  fetch(`${URL_BASE}/storage/v1/object/ticket-photos/${caminho}`, {
    headers: { apikey: ANON, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });

beforeAll(async () => {
  const amb = await prepararIntegracao(carregarEnv);
  URL_BASE = amb.url;
  ANON = amb.anonKey;
  noAr = amb.disponivel;
});

describe('fotos no Storage', () => {
  // Chamado da Mariana, do seed.
  const CHAMADO_MARIANA = 'd0000000-0000-0000-0000-000000000001';

  it('o inquilino do chamado sobe e lê a própria foto', async () => {
    if (!noAr) return;
    const mariana = await entrar('mariana.costa@email.com');
    const caminho = `tickets/${CHAMADO_MARIANA}/${crypto.randomUUID()}.jpg`;

    expect((await subir(caminho, mariana)).status).toBe(200);
    expect((await baixar(caminho, mariana)).status).toBe(200);
  });

  it('o vizinho de andar NÃO sobe no chamado alheio', async () => {
    if (!noAr) return;
    // André mora no Apto 201 do mesmo prédio. É o caso que o protótipo vazava.
    const andre = await entrar('andre.siqueira@email.com');
    const caminho = `tickets/${CHAMADO_MARIANA}/${crypto.randomUUID()}.jpg`;

    expect((await subir(caminho, andre)).status).toBeGreaterThanOrEqual(400);
  });

  it('o vizinho de andar NÃO lê a foto alheia, mesmo sabendo o caminho', async () => {
    if (!noAr) return;
    const mariana = await entrar('mariana.costa@email.com');
    const andre = await entrar('andre.siqueira@email.com');
    const caminho = `tickets/${CHAMADO_MARIANA}/${crypto.randomUUID()}.jpg`;

    expect((await subir(caminho, mariana)).status).toBe(200);
    // Conhecer o caminho não basta: o bucket é privado e a política confere o chamado.
    expect((await baixar(caminho, andre)).status).toBeGreaterThanOrEqual(400);
  });

  it('sem autenticação não se lê nada', async () => {
    if (!noAr) return;
    const mariana = await entrar('mariana.costa@email.com');
    const caminho = `tickets/${CHAMADO_MARIANA}/${crypto.randomUUID()}.jpg`;

    expect((await subir(caminho, mariana)).status).toBe(200);
    expect((await baixar(caminho)).status).toBeGreaterThanOrEqual(400);
  });

  it('a central lê a foto de qualquer chamado', async () => {
    if (!noAr) return;
    const mariana = await entrar('mariana.costa@email.com');
    const central = await entrar('admin@casapronta.com.br');
    const caminho = `tickets/${CHAMADO_MARIANA}/${crypto.randomUUID()}.jpg`;

    expect((await subir(caminho, mariana)).status).toBe(200);
    expect((await baixar(caminho, central)).status).toBe(200);
  });

  it('caminho fora da convenção é recusado', async () => {
    if (!noAr) return;
    const mariana = await entrar('mariana.costa@email.com');
    // `storage_ticket_id` devolve nulo quando o caminho não é `tickets/<uuid>/…`,
    // e a política nega — um caminho malformado nunca vira permissão.
    for (const caminho of [
      `solto-${crypto.randomUUID()}.jpg`,
      `outra-pasta/${CHAMADO_MARIANA}/x.jpg`,
      `tickets/nao-e-uuid/x.jpg`,
    ]) {
      expect((await subir(caminho, mariana)).status).toBeGreaterThanOrEqual(400);
    }
  });

  it('a URL assinada funciona e o anexo fica registrado', async () => {
    if (!noAr) return;
    const mariana = await entrar('mariana.costa@email.com');
    const caminho = `tickets/${CHAMADO_MARIANA}/${crypto.randomUUID()}.jpg`;
    expect((await subir(caminho, mariana)).status).toBe(200);

    // Assinatura: é assim que a interface exibe a foto de um bucket privado.
    const assinatura = await fetch(`${URL_BASE}/storage/v1/object/sign/ticket-photos/${caminho}`, {
      method: 'POST',
      headers: {
        apikey: ANON,
        Authorization: `Bearer ${mariana}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expiresIn: 3600 }),
    });
    expect(assinatura.status).toBe(200);
    const { signedURL } = (await assinatura.json()) as { signedURL: string };
    expect(signedURL).toContain('token=');

    // A URL assinada dispensa cabeçalho de autenticação — é esse o ponto dela.
    expect((await fetch(`${URL_BASE}/storage/v1${signedURL}`)).status).toBe(200);

    // E o registro em `attachments`, que é o que liga a foto ao chamado.
    const registro = await fetch(`${URL_BASE}/rest/v1/attachments`, {
      method: 'POST',
      headers: {
        apikey: ANON,
        Authorization: `Bearer ${mariana}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      // `uploaded_by` não é enviado de propósito: vem por default do token.
      // A política continua recusando quem tentar informar outro id.
      body: JSON.stringify({ ticket_id: CHAMADO_MARIANA, kind: 'chamado', storage_path: caminho }),
    });
    expect(registro.status).toBe(201);
  });

  it('o vizinho NÃO registra anexo no chamado alheio', async () => {
    if (!noAr) return;
    const andre = await entrar('andre.siqueira@email.com');
    const r = await fetch(`${URL_BASE}/rest/v1/attachments`, {
      method: 'POST',
      headers: {
        apikey: ANON,
        Authorization: `Bearer ${andre}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ticket_id: CHAMADO_MARIANA,
        kind: 'chamado',
        storage_path: `tickets/${CHAMADO_MARIANA}/forjado.jpg`,
      }),
    });
    expect(r.status).toBeGreaterThanOrEqual(400);
  });

  it('não dá para forjar a autoria do anexo', async () => {
    if (!noAr) return;
    const mariana = await entrar('mariana.costa@email.com');
    const caminho = `tickets/${CHAMADO_MARIANA}/${crypto.randomUUID()}.jpg`;
    expect((await subir(caminho, mariana)).status).toBe(200);

    // Atribuir o anexo a outra pessoa é recusado pela política, mesmo com o
    // chamado visível: `uploaded_by` precisa ser quem está na sessão.
    const r = await fetch(`${URL_BASE}/rest/v1/attachments`, {
      method: 'POST',
      headers: {
        apikey: ANON,
        Authorization: `Bearer ${mariana}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ticket_id: CHAMADO_MARIANA,
        kind: 'chamado',
        storage_path: caminho,
        uploaded_by: '33333333-3333-3333-3333-333333333333',
      }),
    });
    expect(r.status).toBeGreaterThanOrEqual(400);
  });
});
