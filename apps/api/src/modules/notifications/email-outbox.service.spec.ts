import { EmailOutboxStatus } from '@prisma/client';
import assert from 'node:assert/strict';
import test from 'node:test';
import { EmailOutboxService } from './email-outbox.service';

test('email outbox claims and marks a log-provider message as sent', async () => {
  const previousProvider = process.env.EMAIL_PROVIDER;
  process.env.EMAIL_PROVIDER = 'log';
  const updates: Array<Record<string, unknown>> = [];
  const message = {
    id: 'email-1', to: 'customer@example.com', subject: 'Order', html: '<p>Created</p>',
    attempts: 0, status: EmailOutboxStatus.PENDING, createdAt: new Date(), updatedAt: new Date()
  };
  const prisma = {
    emailOutbox: {
      updateMany: async (args: { where: { id?: string } }) => args.where.id ? { count: 1 } : { count: 0 },
      findMany: async () => [message],
      findUnique: async () => message,
      update: async ({ data }: { data: Record<string, unknown> }) => { updates.push(data); return {}; }
    }
  };

  try {
    await new EmailOutboxService(prisma as never).processPending();
  } finally {
    if (previousProvider === undefined) delete process.env.EMAIL_PROVIDER;
    else process.env.EMAIL_PROVIDER = previousProvider;
  }

  assert.equal(updates[0].status, EmailOutboxStatus.SENT);
  assert.ok(updates[0].sentAt instanceof Date);
});
