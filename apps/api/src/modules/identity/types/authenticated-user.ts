import type { UserRole } from '@prisma/client';

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
};

export type AuthRequest = {
  headers: Record<string, string | string[] | undefined>;
  currentUser?: AuthenticatedUser;
};
