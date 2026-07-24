import { z } from 'zod';

export const checkoutSchema = z.object({
  recipientName: z.string().min(1).max(160),
  recipientPhone: z.string().min(6).max(32),
  shippingAddress: z.object({
    line1: z.string().min(1).max(255),
    line2: z.string().max(255).optional().nullable(),
    city: z.string().min(1).max(120),
    province: z.string().max(120).optional().nullable(),
    postalCode: z.string().max(32).optional().nullable(),
    countryCode: z.string().min(2).max(2).default('VN')
  })
});

export type CheckoutDto = z.infer<typeof checkoutSchema>;
