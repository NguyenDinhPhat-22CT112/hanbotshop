import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { OrderStatus, PaymentStatus, Prisma, UserRole } from '@prisma/client';
import assert from 'node:assert/strict';
import test from 'node:test';
import { PaymentService } from './payment.service';

function payment(id = 'payment-1', amount = 1000) {
  const now = new Date();

  return {
    id,
    orderId: 'order-1',
    provider: 'manual_bank_transfer',
    providerReference: 'checkout-1',
    amount: new Prisma.Decimal(amount),
    status: PaymentStatus.UNPAID,
    payload: null,
    createdAt: now,
    updatedAt: now,
    order: {
      id: 'order-1',
      orderNumber: 'HBO-1',
      userId: 'customer-1',
      total: new Prisma.Decimal(1000),
      depositRequired: new Prisma.Decimal(400),
      paidAmount: new Prisma.Decimal(0),
      paymentStatus: PaymentStatus.UNPAID
    },
    events: []
  };
}

function createPrismaMock(options?: {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  depositRequired?: number;
  paidAmount?: number;
  existingPayment?: ReturnType<typeof payment>;
}) {
  let createCalls = 0;
  let createdAmount = '';
  const existingPayment = options?.existingPayment;
  const tx = {
    order: {
      findUnique: async () => ({
        id: 'order-1',
        userId: 'customer-1',
        status: options?.status ?? OrderStatus.PENDING_CONFIRMATION,
        paymentStatus: options?.paymentStatus ?? PaymentStatus.UNPAID,
        total: new Prisma.Decimal(1000),
        depositRequired: new Prisma.Decimal(options?.depositRequired ?? 400),
        paidAmount: new Prisma.Decimal(options?.paidAmount ?? 0),
        payments: existingPayment ? [existingPayment] : []
      })
    },
    payment: {
      create: async ({ data }: { data: { amount: Prisma.Decimal } }) => {
        createCalls += 1;
        createdAmount = data.amount.toString();
        return payment('payment-created', Number(data.amount));
      }
    }
  };

  return {
    get createCalls() {
      return createCalls;
    },
    get createdAmount() {
      return createdAmount;
    },
    $transaction: async (handler: (client: typeof tx) => unknown) => handler(tx)
  };
}

test('payment creation reuses an existing unpaid deposit payment for the same amount', async () => {
  const prisma = createPrismaMock({ existingPayment: payment('payment-1', 400) });
  const service = new PaymentService(prisma as never);
  const result = await service.createCheckoutSession(
    { id: 'customer-1', role: UserRole.CUSTOMER },
    { orderId: 'order-1' }
  );

  assert.equal(result.payment.id, 'payment-1');
  assert.equal(prisma.createCalls, 0);
});

test('payment creation rejects an already paid order', async () => {
  const prisma = createPrismaMock({ paymentStatus: PaymentStatus.PAID });
  const service = new PaymentService(prisma as never);

  await assert.rejects(
    () =>
      service.createCheckoutSession(
        { id: 'customer-1', role: UserRole.CUSTOMER },
        { orderId: 'order-1' }
      ),
    BadRequestException
  );
});

test('payment creation rejects a cancelled order', async () => {
  const prisma = createPrismaMock({ status: OrderStatus.CANCELLED });
  const service = new PaymentService(prisma as never);

  await assert.rejects(
    () =>
      service.createCheckoutSession(
        { id: 'customer-1', role: UserRole.CUSTOMER },
        { orderId: 'order-1' }
      ),
    BadRequestException
  );
});

test('partially paid pre-order creates a payment for the remaining balance', async () => {
  const prisma = createPrismaMock({ paymentStatus: PaymentStatus.PARTIALLY_PAID, paidAmount: 400 });
  const service = new PaymentService(prisma as never);

  await service.createCheckoutSession({ id: 'customer-1', role: UserRole.CUSTOMER }, { orderId: 'order-1' });

  assert.equal(prisma.createdAmount, '600');
});

test('admin manual confirmation updates payment and order and writes audit history', async () => {
  const calls: string[] = [];
  const pending = payment();
  const paid = { ...pending, status: PaymentStatus.PAID };
  const tx = {
    payment: {
      updateMany: async () => { calls.push('claim-payment'); return { count: 1 }; },
      findUnique: async () => paid
    },
    paymentEvent: { create: async () => { calls.push('payment-event'); return {}; } },
    order: { update: async () => { calls.push('update-order'); return {}; } },
    orderEvent: { create: async () => { calls.push('order-event'); return {}; } },
    auditLog: { create: async () => { calls.push('audit-log'); return {}; } },
    user: { findUnique: async () => null }
  };
  const prisma = {
    payment: { findUnique: async () => pending },
    $transaction: async (handler: (client: typeof tx) => unknown) => handler(tx)
  };
  const service = new PaymentService(prisma as never);
  const result = await service.confirmManualTransfer({ id: 'admin-1', role: UserRole.ADMIN }, pending.id);

  assert.equal(result.status, PaymentStatus.PAID);
  assert.deepEqual(calls, ['claim-payment', 'payment-event', 'update-order', 'order-event', 'audit-log']);
});

test('manual confirmation rejects a payment already claimed by another request', async () => {
  const pending = payment();
  const tx = { payment: { updateMany: async () => ({ count: 0 }) } };
  const prisma = {
    payment: { findUnique: async () => pending },
    $transaction: async (handler: (client: typeof tx) => unknown) => handler(tx)
  };
  const service = new PaymentService(prisma as never);

  await assert.rejects(
    () => service.confirmManualTransfer({ id: 'admin-1', role: UserRole.ADMIN }, pending.id),
    BadRequestException
  );
});

test('customer cannot read a payment belonging to another customer', async () => {
  const prisma = { payment: { findUnique: async () => payment() } };
  const service = new PaymentService(prisma as never);

  await assert.rejects(
    () => service.getPayment({ id: 'other-user', role: UserRole.CUSTOMER }, 'payment-1'),
    ForbiddenException
  );
});

test('payment owner can read their own payment', async () => {
  const prisma = { payment: { findUnique: async () => payment() } };
  const service = new PaymentService(prisma as never);
  const result = await service.getPayment({ id: 'customer-1', role: UserRole.CUSTOMER }, 'payment-1');

  assert.equal(result.id, 'payment-1');
  assert.equal(result.amount, '1000');
});
