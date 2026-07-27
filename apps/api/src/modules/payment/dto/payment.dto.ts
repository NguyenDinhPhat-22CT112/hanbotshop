import { z } from 'zod';

export const checkoutSessionSchema = z.object({
  orderId: z.string().min(1)
});

export const manualReceiptSchema = z.object({
  orderId: z.string().min(1),
  amount: z.coerce.number().positive().max(999_999_999_999),
  note: z.string().trim().max(500).optional()
});

export const paymentWebhookSchema = z.object({
  paymentId: z.string().min(1),
  event: z.string().min(1),
  payload: z.record(z.unknown()).optional().default({})
});

export type CheckoutSessionDto = z.infer<typeof checkoutSessionSchema>;
export type ManualReceiptDto = z.infer<typeof manualReceiptSchema>;
export type PaymentWebhookDto = z.infer<typeof paymentWebhookSchema>;
