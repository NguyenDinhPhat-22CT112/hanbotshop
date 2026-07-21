import { OrderNoteType, OrderStatus, PaymentStatus } from '@prisma/client';
import { z } from 'zod';

export const orderListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(24),
  status: z.nativeEnum(OrderStatus).optional(),
  paymentStatus: z.nativeEnum(PaymentStatus).optional(),
  q: z.string().optional()
});

export const updateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus)
});

export const updateOrderPaymentSchema = z.object({
  paymentStatus: z.nativeEnum(PaymentStatus)
});

export const trackingSchema = z.object({
  trackingNumber: z.string().min(1).max(120),
  trackingCarrier: z.string().min(1).max(120)
});

export const orderNoteSchema = z.object({
  type: z.nativeEnum(OrderNoteType).optional().default(OrderNoteType.GENERAL),
  body: z.string().trim().min(1).max(2000)
});

export type OrderListQueryDto = z.infer<typeof orderListQuerySchema>;
export type UpdateOrderStatusDto = z.infer<typeof updateOrderStatusSchema>;
export type UpdateOrderPaymentDto = z.infer<typeof updateOrderPaymentSchema>;
export type TrackingDto = z.infer<typeof trackingSchema>;
export type OrderNoteDto = z.infer<typeof orderNoteSchema>;
