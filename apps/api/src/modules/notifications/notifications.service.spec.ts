import { NotificationType } from '@prisma/client';
import assert from 'node:assert/strict';
import test from 'node:test';
import { NotificationsService } from './notifications.service';

test('enqueue creates deduplicated in-app notification and email outbox records', async () => {
  const creates: Record<string, unknown>[] = [];
  const tx = {
    notification: { upsert: async (args: Record<string, unknown>) => { creates.push(args); return {}; } },
    emailOutbox: { upsert: async (args: Record<string, unknown>) => { creates.push(args); return {}; } }
  };
  const service = new NotificationsService({} as never);

  await service.enqueue(tx as never, {
    userId: 'user-1', email: 'customer@example.com', orderId: 'order-1', orderNumber: 'HBO-1',
    type: NotificationType.ORDER_CREATED, title: '<Order created>', body: 'Body & details', dedupeKey: 'order-created:order-1'
  });

  assert.equal(creates.length, 2);
  const emailCreate = (creates[1].create as { html: string; dedupeKey: string });
  assert.equal(emailCreate.dedupeKey, 'order-created:order-1');
  assert.match(emailCreate.html, /&lt;Order created&gt;/);
  assert.match(emailCreate.html, /Body &amp; details/);
});

test('notification list and mark-read are scoped to current user', async () => {
  let markWhere: Record<string, unknown> | undefined;
  const prisma = {
    notification: {
      findMany: async () => [{ id: 'notification-1', userId: 'user-1' }],
      count: async () => 1,
      updateMany: async ({ where }: { where: Record<string, unknown> }) => { markWhere = where; return { count: 1 }; }
    }
  };
  const service = new NotificationsService(prisma as never);
  const result = await service.list('user-1');
  await service.markRead('user-1', 'notification-1');

  assert.equal(result.unreadCount, 1);
  assert.deepEqual(markWhere, { id: 'notification-1', userId: 'user-1', readAt: null });
});
