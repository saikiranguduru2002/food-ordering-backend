import { Country, Role } from '@prisma/client';
import { AuthUser } from '../types/auth-user';

/**
 * ReBAC: non-admin users are scoped to their home country.
 * ADMIN may access all data globally (no country filter).
 */
export function applyCountryScope(user: AuthUser): Record<string, never> | { country: Country } {
  if (user.role === Role.ADMIN) {
    return {};
  }
  return { country: user.country };
}
