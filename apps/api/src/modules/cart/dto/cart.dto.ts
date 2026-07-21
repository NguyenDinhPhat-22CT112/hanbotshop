import { z } from 'zod';

export const addCartItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1).optional().nullable(),
  quantity: z.number().int().positive().max(99)
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().positive().max(99)
});

export type AddCartItemDto = z.infer<typeof addCartItemSchema>;
export type UpdateCartItemDto = z.infer<typeof updateCartItemSchema>;
