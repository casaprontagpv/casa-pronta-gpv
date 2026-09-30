import { describe, expect, it } from 'vitest';
import { buildAuthUser, composePropertyAddress, type ProfileRow } from './sessionUser';

/**
 * Mapeamento perfil → vínculos.
 *
 * O isolamento em si passou a ser garantido pela RLS, e está coberto em
 * supabase/tests/01_isolamento.test.sql. O que se testa aqui é a tradução
 * entre o modelo do banco e o formato que a interface usa.
 */

const perfil = (over: Partial<ProfileRow> = {}): ProfileRow => ({
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Mariana Costa',
  email: 'mariana.costa@email.com',
  phone: '(11) 98123-4567',
  role: 'inquilino',
  active: true,
  created_at: '2026-09-01T10:00:00Z',
  updated_at: '2026-09-01T10:00:00Z',
  ...over,
});

describe('composePropertyAddress', () => {
  it('junta endereço e unidade no formato que os chamados usam', () => {
    expect(composePropertyAddress('Rua das Acácias, 450', 'Apto 402')).toBe(
      'Rua das Acácias, 450 - Apto 402'
    );
  });

  it('omite o separador quando não há unidade', () => {
    expect(composePropertyAddress('Rua Oscar Freire, 89', null)).toBe('Rua Oscar Freire, 89');
    expect(composePropertyAddress('Rua Oscar Freire, 89', '  ')).toBe('Rua Oscar Freire, 89');
  });
});

describe('buildAuthUser — inquilino', () => {
  const comImovel = buildAuthUser(perfil(), {
    property: {
      id: 'b1',
      code: 'IMOV-402',
      address: 'Rua das Acácias, 450',
      unit: 'Apto 402',
      agencyId: 'a1',
      agencyName: 'Aliança Gestão Imobiliária',
    },
  });

  it('compõe o endereço do imóvel vinculado', () => {
    expect(comImovel.propertyAddress).toBe('Rua das Acácias, 450 - Apto 402');
    expect(comImovel.propertyCode).toBe('IMOV-402');
  });

  it('herda a imobiliária DO IMÓVEL, não do próprio perfil', () => {
    // Quem administra é a imobiliária do imóvel; o inquilino não escolhe.
    expect(comImovel.agencyId).toBe('a1');
    expect(comImovel.agencyName).toBe('Aliança Gestão Imobiliária');
  });

  it('sem imóvel vinculado, o endereço fica indefinido', () => {
    // A consequência — não enxergar chamado nenhum — é garantida pela RLS.
    const semImovel = buildAuthUser(perfil());
    expect(semImovel.propertyAddress).toBeUndefined();
    expect(semImovel.propertyCode).toBeUndefined();
  });
});

describe('buildAuthUser — demais papéis', () => {
  it('imobiliária recebe o próprio vínculo, sem imóvel', () => {
    const user = buildAuthUser(perfil({ role: 'imobiliaria', name: 'Aliança' }), {
      agency: { id: 'a1', name: 'Aliança Gestão Imobiliária', cnpj: '98.765.432/0001-55' },
    });

    expect(user.agencyId).toBe('a1');
    expect(user.cnpj).toBe('98.765.432/0001-55');
    expect(user.propertyAddress).toBeUndefined();
    expect(user.technicianId).toBeUndefined();
  });

  it('prestador recebe o technicianId', () => {
    const user = buildAuthUser(perfil({ role: 'prestador', name: 'Carlos Santos' }), {
      technicianId: 'c1',
    });

    expect(user.technicianId).toBe('c1');
    expect(user.agencyId).toBeUndefined();
  });

  it('prestador sem técnico vinculado fica sem technicianId', () => {
    const user = buildAuthUser(perfil({ role: 'prestador' }), { technicianId: null });
    expect(user.technicianId).toBeUndefined();
  });

  it('empresa não tem vínculo nenhum', () => {
    const user = buildAuthUser(perfil({ role: 'empresa', name: 'Central' }));
    expect(user.agencyId).toBeUndefined();
    expect(user.propertyAddress).toBeUndefined();
    expect(user.technicianId).toBeUndefined();
  });
});
