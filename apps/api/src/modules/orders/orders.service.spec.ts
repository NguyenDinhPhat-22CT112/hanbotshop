import { ForbiddenException } from '@nestjs/common';
import { OrderStatus, PaymentStatus, UserRole } from '@prisma/client';
import assert from 'node:assert/strict';
import test from 'node:test';
import { OrdersService } from './orders.service';

function order(status: OrderStatus, paymentStatus: PaymentStatus = PaymentStatus.UNPAID) {
  return {
    id: 'order-1',
    userId: 'customer-1',
    status,
    paymentStatus
  };
}

test('customer can cancel an order before admin confirmation', async () => {
  const current = order(OrderStatus.PENDING_CONFIRMATION);
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

test('customer cannot cancel an order after admin confirmation', async () => {
  const current = order(OrderStatus.CONFIRMED);
  const prisma = { order: { findUnique: async () => current } };
  const service = new OrdersService(prisma as never);

  await assert.rejects(
    () => service.cancelOrder({ id: 'customer-1', role: UserRole.CUSTOMER }, current.id),
    ForbiddenException
  );
});

test('admin cannot cancel a paid order', async () => {
  const current = order(OrderStatus.CONFIRMED, PaymentStatus.PAID);
  const prisma = { order: { findUnique: async () => current } };
  const service = new OrdersService(prisma as never);

  await assert.rejects(
    () => service.cancelOrder({ id: 'admin-1', role: UserRole.ADMIN }, current.id),
    ForbiddenException
  );
});

test('admin cannot cancel a shipped order', async () => {
  const current = order(OrderStatus.SHIPPED);
  const prisma = { order: { findUnique: async () => current } };
  const service = new OrdersService(prisma as never);

  await assert.rejects(
    () => service.cancelOrder({ id: 'admin-1', role: UserRole.ADMIN }, current.id),
    ForbiddenException
  );
});
