import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import assert from 'node:assert/strict';
import test from 'node:test';
import { OrdersService } from './orders.service';
import { OrderTimelineService } from './services/order-timeline.service';

test('customer cannot read another customer order', async () => {
  const prisma = { order: { findUnique: async () => ({ id: 'order-1', userId: 'owner-1' }) } };
  const service = new OrdersService(prisma as never);

  await assert.rejects(
    () => service.getOrder({ id: 'attacker-1', role: UserRole.CUSTOMER }, 'order-1'),
    ForbiddenException
  );
});

test('admin passes order ownership authorization', async () => {
  const order = { id: 'order-1', userId: 'owner-1' };
  const prisma = { order: { findUnique: async () => order } };
  const service = new OrdersService(prisma as never);
  service.serializeOrder = ((value: typeof order) => value) as never;

  assert.equal((await service.getOrder({ id: 'admin-1', role: UserRole.ADMIN }, order.id)).id, order.id);
});

test('customer cannot read another customer order timeline', async () => {
  const prisma = {
    order: { findUnique: async () => ({ id: 'order-1', userId: 'owner-1', events: [], payments: [] }) }
  };
  const service = new OrderTimelineService(prisma as never);

  await assert.rejects(
    () => service.getOrderTimeline({ id: 'attacker-1', role: UserRole.CUSTOMER }, 'order-1'),
    ForbiddenException
  );
});

test('customer can read own timeline and events are sorted chronologically', async () => {
  const later = new Date('2026-01-02T00:00:00Z');
  const earlier = new Date('2026-01-01T00:00:00Z');
  const prisma = {
    order: {
      findUnique: async () => ({
        id: 'order-1', userId: 'owner-1',
        events: [{ type: 'STATUS_CHANGED', actorId: 'admin-1', payload: {}, createdAt: later }],
        payments: [{ id: 'payment-1', events: [{ type: 'CHECKOUT_CREATED', createdAt: earlier }] }]
      })
    }
  };
  const service = new OrderTimelineService(prisma as never);
  const result = await service.getOrderTimeline({ id: 'owner-1', role: UserRole.CUSTOMER }, 'order-1');

  assert.equal(result.data[0].type, 'CHECKOUT_CREATED');
  assert.equal(result.data[1].type, 'STATUS_CHANGED');
});
