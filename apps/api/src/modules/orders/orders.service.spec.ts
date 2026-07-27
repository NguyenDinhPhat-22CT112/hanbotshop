import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { OrderStatus, OrderType, PaymentStatus, Prisma, UserRole } from '@prisma/client';
import assert from 'node:assert/strict';
import test from 'node:test';
import { OrdersService } from './orders.service';

function order(status: OrderStatus, paymentStatus: PaymentStatus = PaymentStatus.UNPAID) {
  return {
    id: 'order-1',
    orderNumber: 'HBO-1',
    userId: 'customer-1',
    type: OrderType.ORDER,
    status,
    paymentStatus,
    subtotal: new Prisma.Decimal(970),
    shippingFee: new Prisma.Decimal(30),
    total: new Prisma.Decimal(1000),
    depositRequired: new Prisma.Decimal(400),
    secondPaymentRequired: new Prisma.Decimal(0),
    paidAmount: new Prisma.Decimal(400)
  };
}

test('customer can cancel an Order purchase before paying the deposit', async () => {
  const current = order(OrderStatus.WAITING_DEPOSIT);
  let transactionCalled = false;
  const prisma = {
    order: { findUnique: async () => current },
    $transaction: async () => {
      transactionCalled = true;
      throw new Error('stop after cancellation rule check');
    }
  };
  const service = new OrdersService(prisma as never);

  await assert.rejects(
    () => service.cancelOrder({ id: 'customer-1', role: UserRole.CUSTOMER }, current.id),
    /stop after cancellation rule check/
  );
  assert.equal(transactionCalled, true);
});

test('customer cannot cancel an Order purchase after the deposit is confirmed', async () => {
  const current = order(OrderStatus.DEPOSIT_PAID);
  const prisma = { order: { findUnique: async () => current } };
  const service = new OrdersService(prisma as never);

  await assert.rejects(
    () => service.cancelOrder({ id: 'customer-1', role: UserRole.CUSTOMER }, current.id),
    ForbiddenException
  );
});

test('admin cannot cancel a paid order', async () => {
  const current = order(OrderStatus.DEPOSIT_PAID, PaymentStatus.PAID);
  const prisma = { order: { findUnique: async () => current } };
  const service = new OrdersService(prisma as never);

  await assert.rejects(
    () => service.cancelOrder({ id: 'admin-1', role: UserRole.ADMIN }, current.id),
    ForbiddenException
  );
});

test('admin cannot cancel a shipped order', async () => {
  const current = order(OrderStatus.SHIPPING);
  const prisma = { order: { findUnique: async () => current } };
  const service = new OrdersService(prisma as never);

  await assert.rejects(
    () => service.cancelOrder({ id: 'admin-1', role: UserRole.ADMIN }, current.id),
    ForbiddenException
  );
});

test('admin can request a second payment amount within the remaining balance', async () => {
  const current = order(OrderStatus.DEPOSIT_PAID, PaymentStatus.PARTIALLY_PAID);
  let updateData: { secondPaymentRequired: Prisma.Decimal; status: OrderStatus } | undefined;
  const updated = {
    ...current,
    status: OrderStatus.WAITING_SECOND_PAYMENT,
    secondPaymentRequired: new Prisma.Decimal(500),
    updatedAt: new Date(),
    items: [],
    payments: [],
    events: [],
    notes: [],
    user: { id: 'customer-1', email: 'customer@example.com' }
  };
  const tx = {
    order: {
      update: async ({ data }: { data: typeof updateData }) => {
        updateData = data;
        return updated;
      }
    },
    orderEvent: { create: async () => ({}) },
    auditLog: { create: async () => ({}) },
    user: { findUnique: async () => null }
  };
  const prisma = {
    order: { findUnique: async () => current },
    $transaction: async (handler: (client: typeof tx) => unknown) => handler(tx)
  };
  const service = new OrdersService(prisma as never);

  await service.requestSecondPayment(
    { id: 'admin-1', role: UserRole.ADMIN },
    current.id,
    { amount: 500 }
  );

  assert.equal(updateData?.status, OrderStatus.WAITING_SECOND_PAYMENT);
  assert.equal(updateData?.secondPaymentRequired.toString(), '500');
});

test('admin cannot request a second payment above the remaining balance', async () => {
  const current = order(OrderStatus.DEPOSIT_PAID, PaymentStatus.PARTIALLY_PAID);
  const prisma = { order: { findUnique: async () => current } };
  const service = new OrdersService(prisma as never);

  await assert.rejects(
    () => service.requestSecondPayment(
      { id: 'admin-1', role: UserRole.ADMIN },
      current.id,
      { amount: 601 }
    ),
    BadRequestException
  );
});

test('order cannot be completed while COD balance remains', async () => {
  const current = order(OrderStatus.SHIPPING, PaymentStatus.PARTIALLY_PAID);
  const prisma = { order: { findUnique: async () => current } };
  const service = new OrdersService(prisma as never);

  await assert.rejects(
    () => service.updateOrderStatus(
      { id: 'admin-1', role: UserRole.ADMIN },
      current.id,
      { status: OrderStatus.COMPLETED }
    ),
    BadRequestException
  );
});
