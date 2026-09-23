import { describe, expect, it } from 'vitest';
import type { Database } from './database.types';
import type {
  AppointmentStatus,
  Category,
  PreferredPeriod,
  PriorityLevel,
  PropertyType,
  TicketStatus,
  UserRole,
} from '../types';

/**
 * Contrato entre os enums do Postgres e os union types de src/types.ts.
 *
 * As duas definições precisam dizer exatamente a mesma coisa. Se divergirem, o
 * app envia um valor que o banco recusa — e o erro só apareceria em runtime,
 * provavelmente em produção. Aqui ele aparece no `npm run typecheck`.
 *
 * `database.types.ts` é gerado por `npm run db:types` a partir do banco real,
 * então este arquivo compara o código com o schema, não com outra cópia do código.
 */

type DbEnums = Database['public']['Enums'];

/**
 * Igualdade estrita entre dois tipos.
 *
 * Devolve `true` ou `false` — nunca `never`. A versão ingênua
 * (`[A] extends [B] ? ([B] extends [A] ? true : never) : never`) produz `never`
 * na divergência, e `never` é assignable a qualquer constraint: o teste passava
 * sempre, inclusive com enums diferentes.
 */
type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

/** Quebra o `tsc` quando o argumento de tipo não é exatamente `true`. */
const assertExact = <T extends true>(_?: T) => true;

describe('contrato entre os enums do banco e os tipos do app', () => {
  it('user_role', () => {
    expect(assertExact<Equals<UserRole, DbEnums['user_role']>>()).toBe(true);
  });

  it('ticket_status', () => {
    expect(assertExact<Equals<TicketStatus, DbEnums['ticket_status']>>()).toBe(true);
  });

  it('appointment_status', () => {
    expect(assertExact<Equals<AppointmentStatus, DbEnums['appointment_status']>>()).toBe(true);
  });

  it('priority_level', () => {
    expect(assertExact<Equals<PriorityLevel, DbEnums['priority_level']>>()).toBe(true);
  });

  it('category', () => {
    expect(assertExact<Equals<Category, DbEnums['category']>>()).toBe(true);
  });

  it('property_type', () => {
    expect(assertExact<Equals<PropertyType, DbEnums['property_type']>>()).toBe(true);
  });

  it('preferred_period', () => {
    expect(assertExact<Equals<PreferredPeriod, DbEnums['preferred_period']>>()).toBe(true);
  });
});
