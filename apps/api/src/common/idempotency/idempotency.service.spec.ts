import { ConflictException } from '@nestjs/common';
import assert from 'node:assert/strict';
import test from 'node:test';
import { IdempotencyService } from './idempotency.service';

type RecordValue = {
  id: string;
  key: string;
  scope: string;
  method: string;
  path: string;
  actorId?: string;
  requestHash: string;
  responseStatus: number | null;
  responseBody: unknown | null;
  expiresAt: Date;
};

function createPrismaMock() {
  const records = new Map<string, RecordValue>();

  return {
    records,
    idempotencyRecord: {
      findUnique: async ({ where }: { where: { scope_key: { scope: string; key: string } } }) =>
        records.get(`${where.scope_key.scope}:${where.scope_key.key}`) ?? null,
      create: async ({ data }: { data: Omit<RecordValue, 'id' | 'responseStatus' | 'responseBody'> }) => {
        const id = `record-${records.size + 1}`;
        const record = { ...data, id, responseStatus: null, responseBody: null };
        records.set(`${data.scope}:${data.key}`, record);

        return record;
      },
      update: async ({ where, data }: { where: { id: string }; data: Partial<RecordValue> }) => {
        const record = [...records.values()].find((item) => item.id === where.id);

        if (!record) {
          throw new Error('record not found');
        }

        Object.assign(record, data);

        return record;
      },
      delete: async ({ where }: { where: { id: string } }) => {
        for (const [key, record] of records) {
          if (record.id === where.id) {
            records.delete(key);
          }
        }
      },
      deleteMany: async ({ where }: { where: { expiresAt: { lt: Date } } }) => {
        let count = 0;

        for (const [key, record] of records) {
          if (record.expiresAt < where.expiresAt.lt) {
            records.delete(key);
            count += 1;
          }
        }

        return { count };
      }
    }
  };
}

test('IdempotencyService replays stored response for same key and same payload', async () => {
  const prisma = createPrismaMock();
  const service = new IdempotencyService(prisma as never);
  let calls = 0;
  const operation = {
    key: 'same-key',
    method: 'POST',
    path: '/checkout',
    actorId: 'user-1',
    requestBody: { cartId: 'cart-1' },
    handler: async () => {
      calls += 1;

      return { id: 'order-1' };
    }
  };

  assert.deepEqual(await service.run(operation), { id: 'order-1' });
  assert.deepEqual(await service.run(operation), { id: 'order-1' });
  assert.equal(calls, 1);
});

test('IdempotencyService rejects same key with different payload', async () => {
  const prisma = createPrismaMock();
  const service = new IdempotencyService(prisma as never);

  await service.run({
    key: 'same-key',
    method: 'POST',
    path: '/checkout',
    actorId: 'user-1',
    requestBody: { cartId: 'cart-1' },
    handler: async () => ({ id: 'order-1' })
  });

  await assert.rejects(
    () =>
      service.run({
        key: 'same-key',
        method: 'POST',
        path: '/checkout',
        actorId: 'user-1',
        requestBody: { cartId: 'cart-2' },
        handler: async () => ({ id: 'order-2' })
      }),
    ConflictException
  );
});

test('IdempotencyService cleanup removes expired records', async () => {
  const prisma = createPrismaMock();
  const service = new IdempotencyService(prisma as never);
  const expired = new Date(Date.now() - 1000);
  prisma.records.set('scope:key', {
    id: 'record-1',
    key: 'key',
    scope: 'scope',
    method: 'POST',
    path: '/checkout',
    requestHash: 'hash',
    responseStatus: 200,
    responseBody: {},
    expiresAt: expired
  });

  await service.cleanupExpired();

  assert.equal(prisma.records.size, 0);
});
