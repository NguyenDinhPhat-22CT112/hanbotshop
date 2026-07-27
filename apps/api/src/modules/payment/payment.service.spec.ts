import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { OrderStatus, OrderType, PaymentStatus, Prisma, UserRole } from '@prisma/client';
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
      type: OrderType.ORDER,
      status: OrderStatus.WAITING_DEPOSIT,
      total: new Prisma.Decimal(1000),
      depositRequired: new Prisma.Decimal(400),
      secondPaymentRequired: new Prisma.Decimal(0),
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
  secondPaymentRequired?: number;
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
        type: OrderType.ORDER,
        status: options?.status ?? OrderStatus.WAITING_DEPOSIT,
        paymentStatus: options?.paymentStatus ?? PaymentStatus.UNPAID,
        total: new Prisma.Decimal(1000),
        depositRequired: new Prisma.Decimal(options?.depositRequired ?? 400),
        secondPaymentRequired: new Prisma.Decimal(options?.secondPaymentRequired ?? 0),
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

test('second-payment request creates a payment for the amount entered by Admin', async () => {
  const prisma = createPrismaMock({
    status: OrderStatus.WAITING_SECOND_PAYMENT,
    paymentStatus: PaymentStatus.PARTIALLY_PAID,
    paidAmount: 400,
    secondPaymentRequired: 600
  });
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
  assert.deepEqual(calls, ['claim-payment', 'payment-event', 'update-order', 'order-event', 'order-event', 'audit-log']);
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

test('payment details use the latest configured bank and QR information', async () => {
  const previousBankName = process.env.BANK_TRANSFER_BANK_NAME;
  const previousQrUrl = process.env.BANK_TRANSFER_QR_URL;
  process.env.BANK_TRANSFER_BANK_NAME = 'Test Bank';
  process.env.BANK_TRANSFER_QR_URL = 'https://example.com/payment-qr.png';

  try {
    const prisma = { payment: { findUnique: async () => payment() } };
    const service = new PaymentService(prisma as never);
    const result = await service.getPayment({ id: 'customer-1', role: UserRole.CUSTOMER }, 'payment-1');

    assert.equal((result.payload as { bankName?: string }).bankName, 'Test Bank');
    assert.equal((result.payload as { qrUrl?: string }).qrUrl, 'https://example.com/payment-qr.png');
  } finally {
    if (previousBankName === undefined) delete process.env.BANK_TRANSFER_BANK_NAME;
    else process.env.BANK_TRANSFER_BANK_NAME = previousBankName;
    if (previousQrUrl === undefined) delete process.env.BANK_TRANSFER_QR_URL;
    else process.env.BANK_TRANSFER_QR_URL = previousQrUrl;
  }
});

test('admin can record the remaining COD amount while an Order purchase is shipping', async () => {
  const shippingOrder = {
    ...payment().order,
    status: OrderStatus.SHIPPING,
    paidAmount: new Prisma.Decimal(800),
    paymentStatus: PaymentStatus.PARTIALLY_PAID
  };
  let orderUpdate: { paidAmount: Prisma.Decimal; paymentStatus: PaymentStatus } | undefined;
  let paymentAmount = '';
  const codPayment = {
    ...payment('payment-cod', 200),
    provider: 'cash_on_delivery',
    status: PaymentStatus.PAID,
    order: {
      ...shippingOrder,
      paidAmount: new Prisma.Decimal(1000),
      paymentStatus: PaymentStatus.PAID
    }
  };
  const tx = {
    order: {
      update: async ({ data }: { data: typeof orderUpdate }) => {
        orderUpdate = data;
        return {};
      }
    },
    payment: {
      create: async ({ data }: { data: { amount: Prisma.Decimal } }) => {
        paymentAmount = data.amount.toString();
        return { id: 'payment-cod' };
      },
      findUnique: async () => codPayment
    },
    orderEvent: { create: async () => ({}) },
    auditLog: { create: async () => ({}) }
  };
  const prisma = {
    order: { findUnique: async () => shippingOrder },
    $transaction: async (handler: (client: typeof tx) => unknown) => handler(tx)
  };
  const service = new PaymentService(prisma as never);

  const result = await service.recordManualReceipt(
    { id: 'admin-1', role: UserRole.ADMIN },
    { orderId: shippingOrder.id, amount: 200 }
  );

  assert.equal(paymentAmount, '200');
  assert.equal(orderUpdate?.paidAmount.toString(), '1000');
  assert.equal(orderUpdate?.paymentStatus, PaymentStatus.PAID);
  assert.equal(result.status, PaymentStatus.PAID);
});
