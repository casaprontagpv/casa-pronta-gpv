import { AuthUser } from './types';

/**
 * Usuário de demonstração com senha em texto puro.
 *
 * ⚠️ Isto NÃO é autenticação. É um seed de demonstração que vive inteiramente no navegador.
 * Será substituído por Supabase Auth na Etapa 3 (ver docs/PLANO-MIGRACAO.md).
 * O campo se chama `demoPassword` justamente para não passar a impressão de ser um hash.
 */
export interface DemoUser extends AuthUser {
  demoPassword: string;
}

export const PRESET_USERS: DemoUser[] = [
  // --- INQUILINOS (Acesso restrito 100% ao SEU imóvel - Zero acesso ao dashboard da empresa ou faturamentos) ---
  {
    id: 'user-tenant-mariana',
    name: 'Mariana Costa',
    email: 'mariana.costa@email.com',
    role: 'inquilino',
    phone: '(11) 98123-4567',
    propertyAddress: 'Rua das Acácias, 450 - Apto 402',
    propertyUnit: 'Apto 402',
    propertyCode: 'IMOV-402',
    agencyId: 'imob-alianca',
    agencyName: 'Aliança Gestão Imobiliária',
    demoPassword: '123',
  },
  {
    id: 'user-tenant-roberto',
    name: 'Roberto Nunes',
    email: 'roberto.nunes@email.com',
    role: 'inquilino',
    phone: '(11) 97234-8899',
    propertyAddress: 'Av. Paulista, 1200 - Apto 84',
    propertyUnit: 'Apto 84',
    propertyCode: 'IMOV-084',
    agencyId: 'imob-alianca',
    agencyName: 'Aliança Gestão Imobiliária',
    demoPassword: '123',
  },
  {
    id: 'user-tenant-camila',
    name: 'Camila Toledo',
    email: 'camila.toledo@email.com',
    role: 'inquilino',
    phone: '(11) 98999-1122',
    propertyAddress: 'Rua Oscar Freire, 89 - Casa 3',
    propertyUnit: 'Casa 3',
    propertyCode: 'IMOV-003',
    agencyId: 'imob-alianca',
    agencyName: 'Aliança Gestão Imobiliária',
    demoPassword: '123',
  },
  {
    id: 'user-tenant-felipe',
    name: 'Felipe Guimarães',
    email: 'felipe.g@email.com',
    role: 'inquilino',
    phone: '(11) 97766-5544',
    propertyAddress: 'Alameda Santos, 320 - Apto 1102',
    propertyUnit: 'Apto 1102',
    propertyCode: 'IMOV-1102',
    agencyId: 'imob-alianca',
    agencyName: 'Aliança Gestão Imobiliária',
    demoPassword: '123',
  },

  // --- IMOBILIÁRIAS (Acesso restrito SOMENTE aos imóveis sob sua gestão - Zero faturamento interno da prestadora) ---
  {
    id: 'user-imob-alianca',
    name: 'Aliança Gestão Imobiliária',
    email: 'gestao@aliancaimoveis.com.br',
    role: 'imobiliaria',
    phone: '(11) 3987-6543',
    agencyId: 'imob-alianca',
    agencyName: 'Aliança Gestão Imobiliária',
    cnpj: '98.765.432/0001-55',
    demoPassword: '123',
  },
  {
    id: 'user-imob-solar',
    name: 'Solar Negócios Imobiliários',
    email: 'contato@solarimoveis.com.br',
    role: 'imobiliaria',
    phone: '(11) 3456-7890',
    agencyId: 'imob-solar',
    agencyName: 'Solar Negócios Imobiliários',
    cnpj: '45.123.789/0001-12',
    demoPassword: '123',
  },
  {
    id: 'user-imob-prime',
    name: 'Prime Imóveis & Locações',
    email: 'contato@primeimoveis.com.br',
    role: 'imobiliaria',
    phone: '(11) 3123-4567',
    agencyId: 'imob-prime',
    agencyName: 'Prime Imóveis & Locações',
    cnpj: '12.345.678/0001-90',
    demoPassword: '123',
  },

  // --- EMPRESA PRESTADORA (Acesso Completo ao Dashboard Operacional, Faturamentos e Rotas) ---
  {
    id: 'user-empresa-admin',
    name: 'Casa Pronta Manutenções (Central)',
    email: 'admin@casapronta.com.br',
    role: 'empresa',
    phone: '(11) 4004-9988',
    demoPassword: 'admin',
  },

  // --- TÉCNICO DE CAMPO ---
  {
    id: 'user-tech-carlos',
    name: 'Carlos Santos (Hidráulica)',
    email: 'carlos.santos@casapronta.com.br',
    role: 'prestador',
    phone: '(11) 98765-4321',
    technicianId: 'tech-carlos',
    demoPassword: '123',
  },
];
