import { AuditAction } from '@prisma/client';
import { z } from 'zod';

export const auditListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(24),
  action: z.nativeEnum(AuditAction).optional(),
  actorId: z.string().trim().min(1).optional(),
  resourceType: z.string().trim().min(1).max(80).optional(),
  resourceId: z.string().trim().min(1).optional()
});

export type AuditListQueryDto = z.infer<typeof auditListQuerySchema>;
