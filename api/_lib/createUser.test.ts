import { describe, expect, it } from 'vitest';
import { gerarSenhaTemporaria, validarNovoUsuario } from './createUser';

/**
 * Validação de entrada e geração de senha do endpoint administrativo.
 *
 * A autorização em si (JWT válido + papel `empresa`) é exercitada contra o
 * Supabase local em `api/_lib/adminAuth.integration.test.ts` — aqui ficam as
 * partes puras, que não precisam de rede.
 */

describe('validarNovoUsuario', () => {
  const valido = { name: 'Mariana Costa', email: 'mariana@exemplo.com', role: 'inquilino' };

  it('aceita um cadastro completo', () => {
    const r = validarNovoUsuario({ ...valido, phone: '(11) 98123-4567' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.dados.email).toBe('mariana@exemplo.com');
      expect(r.dados.role).toBe('inquilino');
      expect(r.dados.phone).toBe('(11) 98123-4567');
    }
  });

  it('normaliza o e-mail para minúsculas e sem espaços', () => {
    const r = validarNovoUsuario({ ...valido, email: '  Mariana@Exemplo.COM  ' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.dados.email).toBe('mariana@exemplo.com');
  });

  it('recusa papel fora do enum', () => {
    // Impede que alguém invente 'admin' ou 'superuser' pelo corpo da requisição.
    for (const role of ['admin', 'superuser', 'EMPRESA', '', null, 123]) {
      const r = validarNovoUsuario({ ...valido, role });
      expect(r.ok).toBe(false);
    }
  });

  it('aceita os quatro papéis do domínio', () => {
    for (const role of ['inquilino', 'imobiliaria', 'empresa', 'prestador']) {
      expect(validarNovoUsuario({ ...valido, role }).ok).toBe(true);
    }
  });

  it('recusa e-mail inválido', () => {
    for (const email of ['', 'sem-arroba', 'a@b', 'a@b.c', '@exemplo.com', 'a b@exemplo.com']) {
      expect(validarNovoUsuario({ ...valido, email }).ok).toBe(false);
    }
  });

  it('recusa nome vazio ou curto demais', () => {
    for (const name of ['', ' ', 'A', '  x  ']) {
      expect(validarNovoUsuario({ ...valido, name }).ok).toBe(false);
    }
  });

  it('recusa corpo que não é objeto', () => {
    for (const body of [null, undefined, 'texto', 42, []]) {
      expect(validarNovoUsuario(body).ok).toBe(false);
    }
  });

  it('ignora campos extras — só o que foi validado passa adiante', () => {
    const r = validarNovoUsuario({ ...valido, active: false, id: 'forjado', is_admin: true });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(Object.keys(r.dados).sort()).toEqual(['email', 'name', 'phone', 'role', 'sendInvite']);
    }
  });

  it('sendInvite só é verdadeiro com o booleano exato', () => {
    expect(validarNovoUsuario({ ...valido, sendInvite: 'sim' })).toMatchObject({
      ok: true,
      dados: { sendInvite: false },
    });
    expect(validarNovoUsuario({ ...valido, sendInvite: true })).toMatchObject({
      ok: true,
      dados: { sendInvite: true },
    });
  });
});

describe('gerarSenhaTemporaria', () => {
  it('tem o comprimento pedido', () => {
    expect(gerarSenhaTemporaria()).toHaveLength(14);
    expect(gerarSenhaTemporaria(20)).toHaveLength(20);
  });

  it('não usa caracteres ambíguos — a senha é ditada por telefone', () => {
    const amostra = Array.from({ length: 200 }, () => gerarSenhaTemporaria()).join('');
    for (const c of ['O', '0', 'l', '1', 'I']) {
      expect(amostra).not.toContain(c);
    }
  });

  it('não repete entre chamadas', () => {
    const senhas = new Set(Array.from({ length: 500 }, () => gerarSenhaTemporaria()));
    expect(senhas.size).toBe(500);
  });

  it('usa uma parcela ampla do alfabeto', () => {
    // Guarda contra um gerador que colapse para poucos caracteres.
    const distintos = new Set(gerarSenhaTemporaria(2000));
    expect(distintos.size).toBeGreaterThan(40);
  });
});
