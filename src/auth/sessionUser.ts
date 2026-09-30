import type { AuthUser } from '../types';
import type { Tables } from '../lib/supabase';

/**
 * Monta o `AuthUser` do app a partir do perfil e dos vínculos do banco.
 *
 * Separado do React e da rede de propósito: é a tradução entre o modelo do
 * Postgres (chaves estrangeiras) e o formato que `src/domain/access.ts` espera.
 * Errar aqui significa um usuário enxergando o imóvel de outra pessoa, então
 * o mapeamento tem teste próprio.
 */

export type ProfileRow = Tables<'profiles'>;

/** Imóvel do qual o usuário é locatário ativo. */
export interface PropertyBinding {
  id: string;
  code: string;
  address: string;
  unit: string | null;
  agencyId: string;
  agencyName: string;
}

/** Imobiliária à qual o usuário pertence. */
export interface AgencyBinding {
  id: string;
  name: string;
  cnpj: string | null;
}

export interface SessionBindings {
  property?: PropertyBinding | null;
  agency?: AgencyBinding | null;
  technicianId?: string | null;
}

/**
 * Compõe endereço e unidade num único texto.
 *
 * Transitório: enquanto os chamados vêm do `localStorage`, o filtro de
 * isolamento compara este texto com `ticket.address`, que é uma string só
 * ("Rua das Acácias, 450 - Apto 402"). Some na etapa da camada de dados,
 * quando a RLS passa a fazer o isolamento por chave estrangeira.
 */
export const composePropertyAddress = (address: string, unit?: string | null): string => {
  const cleanUnit = unit?.trim();
  return cleanUnit ? `${address.trim()} - ${cleanUnit}` : address.trim();
};

export const buildAuthUser = (profile: ProfileRow, bindings: SessionBindings = {}): AuthUser => {
  const { property, agency, technicianId } = bindings;

  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role: profile.role,
    phone: profile.phone ?? undefined,

    // Inquilino: vínculo com o imóvel. A imobiliária vem do imóvel, não do perfil —
    // é ela quem administra, e o inquilino não escolhe.
    propertyAddress: property ? composePropertyAddress(property.address, property.unit) : undefined,
    propertyUnit: property?.unit ?? undefined,
    propertyCode: property?.code ?? undefined,

    // `agencyId` tem duas origens: a imobiliária do próprio usuário, ou a que
    // administra o imóvel dele. Nunca as duas ao mesmo tempo.
    agencyId: agency?.id ?? property?.agencyId ?? undefined,
    agencyName: agency?.name ?? property?.agencyName ?? undefined,
    cnpj: agency?.cnpj ?? undefined,

    technicianId: technicianId ?? undefined,
  };
};
