import { ProductionPriority, ProductionStatus } from '@prisma/client';
import { z } from 'zod';

export const productionJobListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(24),
  status: z.nativeEnum(ProductionStatus).optional(),
  orderId: z.string().min(1).optional(),
  priority: z.nativeEnum(ProductionPriority).optional(),
  q: z.string().optional()
});

export const createProductionJobSchema = z.object({
  orderId: z.string().min(1),
  title: z.string().min(1).max(220),
  status: z.nativeEnum(ProductionStatus).optional().default(ProductionStatus.QUEUED),
  note: z.string().max(2000).optional().nullable()
});

export const updateProductionJobStatusSchema = z.object({
  status: z.nativeEnum(ProductionStatus),
  note: z.string().max(2000).optional().nullable()
});

export const addProductionEventSchema = z.object({
  status: z.nativeEnum(ProductionStatus),
  note: z.string().max(2000).optional().nullable()
});

export const addInternalNoteSchema = z.object({
  body: z.string().min(1).max(5000)
});

export const updateProductionJobAssigneeSchema = z.object({
  assigneeId: z.string().min(1).optional().nullable()
});

export const updateProductionJobPrioritySchema = z.object({
  priority: z.nativeEnum(ProductionPriority)
});

export type ProductionJobListQueryDto = z.infer<typeof productionJobListQuerySchema>;
export type CreateProductionJobDto = z.infer<typeof createProductionJobSchema>;
export type UpdateProductionJobStatusDto = z.infer<typeof updateProductionJobStatusSchema>;
export type AddProductionEventDto = z.infer<typeof addProductionEventSchema>;
export type AddInternalNoteDto = z.infer<typeof addInternalNoteSchema>;
export type UpdateProductionJobAssigneeDto = z.infer<typeof updateProductionJobAssigneeSchema>;
export type UpdateProductionJobPriorityDto = z.infer<typeof updateProductionJobPrioritySchema>;
