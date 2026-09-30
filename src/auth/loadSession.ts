import { supabase } from '../lib/supabase';
import type { AuthUser } from '../types';
import { buildAuthUser, type AgencyBinding, type PropertyBinding, type ProfileRow } from './sessionUser';

/**
 * Carrega o perfil do usuário autenticado e os vínculos que definem o que ele enxerga.
 *
 * Toda consulta aqui passa pela RLS: se a política estiver errada, o usuário
 * recebe vazio em vez de dado alheio. Isto NÃO é o controle de acesso — é só a
 * leitura dos próprios vínculos para a interface saber o que mostrar.
 */

export class InactiveProfileError extends Error {
  constructor() {
    super('Sua conta está desativada. Procure a administração da Casa Pronta.');
    this.name = 'InactiveProfileError';
  }
}

export class MissingProfileError extends Error {
  constructor() {
    super('Sua conta existe mas ainda não foi configurada. Procure a administração.');
    this.name = 'MissingProfileError';
  }
}

const loadPropertyBinding = async (profileId: string): Promise<PropertyBinding | null> => {
  const { data, error } = await supabase
    .from('property_tenants')
    .select('properties(id, code, address, unit, agency_id, agencies(id, name))')
    .eq('profile_id', profileId)
    .eq('active', true)
    .maybeSingle();

  if (error) throw error;

  const property = data?.properties;
  if (!property) return null;

  return {
    id: property.id,
    code: property.code,
    address: property.address,
    unit: property.unit,
    agencyId: property.agency_id,
    agencyName: property.agencies?.name ?? '',
  };
};

const loadAgencyBinding = async (profileId: string): Promise<AgencyBinding | null> => {
  const { data, error } = await supabase
    .from('agency_members')
    .select('agencies(id, name, cnpj)')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (error) throw error;

  const agency = data?.agencies;
  if (!agency) return null;

  return { id: agency.id, name: agency.name, cnpj: agency.cnpj };
};

const loadTechnicianId = async (profileId: string): Promise<string | null> => {
  const { data, error } = await supabase
    .from('technicians')
    .select('id')
    .eq('profile_id', profileId)
    .eq('active', true)
    .maybeSingle();

  if (error) throw error;
  return data?.id ?? null;
};

export const loadSessionUser = async (userId: string): Promise<AuthUser> => {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!profile) throw new MissingProfileError();
  if (!profile.active) throw new InactiveProfileError();

  const row = profile as ProfileRow;

  // Só busca o vínculo que o papel exige — um inquilino não tem imobiliária
  // própria, um técnico não tem imóvel.
  switch (row.role) {
    case 'inquilino':
      return buildAuthUser(row, { property: await loadPropertyBinding(userId) });

    case 'imobiliaria':
      return buildAuthUser(row, { agency: await loadAgencyBinding(userId) });

    case 'prestador':
      return buildAuthUser(row, { technicianId: await loadTechnicianId(userId) });

    case 'empresa':
      // A central não tem vínculo: ela enxerga tudo.
      return buildAuthUser(row);
  }
};
