import { Country, Role } from '@prisma/client';

/** Attached to `req.user` after JWT validation */
export type AuthUser = {
  id: string;
  role: Role;
  country: Country;
};
