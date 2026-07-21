import { z } from 'zod';

const safePublicMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export const createFileSchema = z
  .object({
    originalName: z.string().min(1).max(255),
    mimeType: z.string().min(1).max(120),
    size: z.number().int().positive().max(100 * 1024 * 1024),
    isPublic: z.boolean().optional().default(false)
  })
  .superRefine((value, context) => {
    if (value.isPublic && !safePublicMimeTypes.includes(value.mimeType)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['mimeType'],
        message: 'Public uploads only allow jpeg, png, webp, or gif images.'
      });
    }
  });

export type CreateFileDto = z.infer<typeof createFileSchema>;
