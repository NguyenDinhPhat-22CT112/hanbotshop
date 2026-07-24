import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '@prisma/client';

export const rolesMetadataKey = 'roles';

export const Roles = (...roles: UserRole[]) => SetMetadata(rolesMetadataKey, roles);
