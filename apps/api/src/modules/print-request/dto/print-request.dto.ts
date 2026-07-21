import { z } from 'zod';

export const createPrintRequestSchema = z.object({
  customerName: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().min(6).max(32),
  modelName: z.string().min(2).max(180),
  scale: z.string().max(60).optional().nullable(),
  dimensions: z.string().max(120).optional().nullable(),
  quantity: z.number().int().min(1).max(100),
  material: z.string().max(100).optional().nullable(),
  color: z.string().max(100).optional().nullable(),
  note: z.string().max(3000).optional().nullable(),
  imageUrls: z.array(z.string().url()).min(1).max(10)
});
export type CreatePrintRequestDto = z.infer<typeof createPrintRequestSchema>;
