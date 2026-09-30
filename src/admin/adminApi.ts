import { supabase } from '../lib/supabase';
import type { Tables } from '../lib/supabase';
import type { UserRole } from '../types';

/**
 * Camada de dados do painel administrativo.
 *
 * Quase tudo aqui vai direto ao Postgres pelo supabase-js: a RLS já permite à
 * central gerenciar imobiliárias, imóveis, vínculos e técnicos.
 *
 * A única exceção é criar conta de usuário — isso exige a `service_role`, que
 * nunca chega ao navegador, e por isso passa pela função em `/api/admin/users`.
 */

export type Agency = Tables<'agencies'>;
export type Property = Tables<'properties'>;
export type Technician = Tables<'technicians'>;
export type Profile = Tables<'profiles'>;

export class AdminError extends Error {}

const ou = <T>(data: T | null, error: { message: string } | null): T => {
  if (error) throw new AdminError(traduzir(error.message));
  if (data === null) throw new AdminError('Registro não encontrado.');
  return data;
};

const traduzir = (mensagem: string): string => {
  const m = mensagem.toLowerCase();
  if (m.includes('duplicate key') && m.includes('cnpj'))
    return 'Já existe imobiliária com este CNPJ.';
  if (m.includes('duplicate key') && m.includes('code')) return 'Já existe imóvel com este código.';
  if (m.includes('duplicate key')) return 'Este registro já existe.';
  if (m.includes('property_tenants_one_active_per_property')) {
    return 'Este imóvel já tem um locatário ativo. Encerre o vínculo anterior primeiro.';
  }
  if (m.includes('violates foreign key')) return 'Referência inválida — recarregue a página.';
  if (m.includes('violates row-level security')) return 'Você não tem permissão para esta ação.';
  return mensagem;
};

// ─── Imobiliárias ───────────────────────────────────────────────────────────

export const listAgencies = async (): Promise<Agency[]> => {
  const { data, error } = await supabase.from('agencies').select('*').order('name');
  return ou(data, error);
};

export const createAgency = async (input: {
  name: string;
  cnpj?: string;
  phone?: string;
  email?: string;
}): Promise<Agency> => {
  const { data, error } = await supabase
    .from('agencies')
    .insert({
      name: input.name.trim(),
      cnpj: input.cnpj?.trim() || null,
      phone: input.phone?.trim() || null,
      email: input.email?.trim().toLowerCase() || null,
    })
    .select()
    .single();
  return ou(data, error);
};

export const setAgencyActive = async (id: string, active: boolean): Promise<void> => {
  const { error } = await supabase.from('agencies').update({ active }).eq('id', id);
  if (error) throw new AdminError(traduzir(error.message));
};

// ─── Imóveis ────────────────────────────────────────────────────────────────

export interface PropertyWithAgency extends Property {
  agencies: { name: string } | null;
}

export const listProperties = async (): Promise<PropertyWithAgency[]> => {
  const { data, error } = await supabase
    .from('properties')
    .select('*, agencies(name)')
    .order('address');
  return ou(data, error);
};

export const createProperty = async (input: {
  agencyId: string;
  code: string;
  address: string;
  unit?: string;
  neighborhood?: string;
  propertyType: Tables<'properties'>['property_type'];
}): Promise<Property> => {
  const { data, error } = await supabase
    .from('properties')
    .insert({
      agency_id: input.agencyId,
      code: input.code.trim().toUpperCase(),
      address: input.address.trim(),
      unit: input.unit?.trim() || null,
      neighborhood: input.neighborhood?.trim() || null,
      property_type: input.propertyType,
    })
    .select()
    .single();
  return ou(data, error);
};

// ─── Vínculo inquilino ↔ imóvel ─────────────────────────────────────────────

export interface TenancyRow {
  id: string;
  active: boolean;
  started_at: string;
  ended_at: string | null;
  profiles: { id: string; name: string; email: string; phone: string | null } | null;
  properties: { id: string; code: string; address: string; unit: string | null } | null;
}

export const listTenancies = async (): Promise<TenancyRow[]> => {
  const { data, error } = await supabase
    .from('property_tenants')
    .select(
      'id, active, started_at, ended_at, profiles(id, name, email, phone), properties(id, code, address, unit)'
    )
    .order('active', { ascending: false });
  return ou(data, error);
};

export const linkTenantToProperty = async (
  propertyId: string,
  profileId: string
): Promise<void> => {
  const { error } = await supabase
    .from('property_tenants')
    .insert({ property_id: propertyId, profile_id: profileId });
  if (error) throw new AdminError(traduzir(error.message));
};

/**
 * Encerra o vínculo em vez de apagá-lo.
 *
 * O histórico do imóvel referencia quem morava nele quando cada chamado foi
 * aberto — apagar reescreveria o passado.
 */
export const endTenancy = async (tenancyId: string): Promise<void> => {
  const { error } = await supabase
    .from('property_tenants')
    .update({ active: false, ended_at: new Date().toISOString() })
    .eq('id', tenancyId);
  if (error) throw new AdminError(traduzir(error.message));
};

// ─── Técnicos ───────────────────────────────────────────────────────────────

export const listTechnicians = async (): Promise<Technician[]> => {
  const { data, error } = await supabase.from('technicians').select('*').order('name');
  return ou(data, error);
};

export const createTechnician = async (input: {
  profileId: string | null;
  name: string;
  team: string;
  specialties: string[];
  phone?: string;
  email?: string;
}): Promise<Technician> => {
  const { data, error } = await supabase
    .from('technicians')
    .insert({
      profile_id: input.profileId,
      name: input.name.trim(),
      team: input.team.trim(),
      specialties: input.specialties,
      phone: input.phone?.trim() || null,
      email: input.email?.trim().toLowerCase() || null,
    })
    .select()
    .single();
  return ou(data, error);
};

export const setTechnicianActive = async (id: string, active: boolean): Promise<void> => {
  const { error } = await supabase.from('technicians').update({ active }).eq('id', id);
  if (error) throw new AdminError(traduzir(error.message));
};

// ─── Perfis ─────────────────────────────────────────────────────────────────

export const listProfiles = async (role?: UserRole): Promise<Profile[]> => {
  let q = supabase.from('profiles').select('*').order('name');
  if (role) q = q.eq('role', role);
  const { data, error } = await q;
  return ou(data, error);
};

/**
 * Desativa em vez de apagar.
 *
 * A timeline referencia o autor de cada evento; remover o perfil transformaria
 * autoria em nulo e apagaria parte do registro auditável.
 */
export const setProfileActive = async (id: string, active: boolean): Promise<void> => {
  const { error } = await supabase.from('profiles').update({ active }).eq('id', id);
  if (error) throw new AdminError(traduzir(error.message));
};

// ─── Criação de conta (passa pelo servidor) ─────────────────────────────────

export interface NovaConta {
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  sendInvite?: boolean;
}

export interface ContaCriada {
  userId: string;
  email: string;
  /** Devolvida uma única vez, quando não é convite por e-mail. */
  temporaryPassword?: string;
  invited?: boolean;
}

export const createUserAccount = async (input: NovaConta): Promise<ContaCriada> => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new AdminError('Sessão expirada. Entre novamente.');

  const resposta = await fetch('/api/admin/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });

  const corpo = (await resposta.json().catch(() => ({}))) as ContaCriada & { error?: string };
  if (!resposta.ok) throw new AdminError(corpo.error ?? 'Não foi possível criar a conta.');
  return corpo;
};
