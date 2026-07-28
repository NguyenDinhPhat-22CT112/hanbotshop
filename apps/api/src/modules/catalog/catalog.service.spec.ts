import { ConflictException } from '@nestjs/common';
import assert from 'node:assert/strict';
import test from 'node:test';
import { CatalogService } from './catalog.service';

test('CatalogService lists searchable tags with usage counts and system markers', async () => {
  let receivedWhere: unknown;
  const prisma = {
    tag: {
      findMany: async ({ where }: { where: unknown }) => {
        receivedWhere = where;
        return [
          { id: 'tag-order', name: 'Order', slug: 'order', _count: { products: 4 } },
          { id: 'tag-brand', name: 'Nendoroid', slug: 'nendoroid', _count: { products: 2 } }
        ];
      }
    }
  };
  const service = new CatalogService(prisma as never);

  const result = await service.listTags({ q: 'order' });

  assert.ok(receivedWhere);
  assert.equal(result.data[0]?.isSystem, true);
  assert.equal(result.data[1]?.isSystem, false);
  assert.equal(result.data[1]?._count.products, 2);
});

test('CatalogService creates a reusable tag with a normalized slug', async () => {
  let createdData: { name: string; slug: string } | undefined;
  const prisma = {
    tag: {
      findUnique: async () => null,
      create: async ({ data }: { data: { name: string; slug: string } }) => {
        createdData = data;
        return { id: 'tag-1', ...data };
      }
    }
  };
  const service = new CatalogService(prisma as never);

  const result = await service.createTag({ name: '  Mô hình mới  ', slug: 'Mô hình mới' });

  assert.deepEqual(createdData, { name: 'Mô hình mới', slug: 'mo-hinh-moi' });
  assert.equal(result.slug, 'mo-hinh-moi');
});

test('CatalogService protects system tags from editing', async () => {
  const prisma = {
    tag: {
      findUnique: async () => ({
        id: 'tag-order',
        name: 'Order',
        slug: 'order',
        _count: { products: 4 }
      })
    }
  };
  const service = new CatalogService(prisma as never);

  await assert.rejects(
    () => service.updateTag('tag-order', { name: 'Khác' }),
    ConflictException
  );
});

test('CatalogService deletes a regular tag and reports affected products', async () => {
  let deletedId: string | undefined;
  const prisma = {
    tag: {
      findUnique: async () => ({
        id: 'tag-1',
        name: 'Nendoroid',
        slug: 'nendoroid',
        _count: { products: 3 }
      }),
      delete: async ({ where }: { where: { id: string } }) => {
        deletedId = where.id;
        return {};
      }
    }
  };
  const service = new CatalogService(prisma as never);

  const result = await service.deleteTag('tag-1');

  assert.equal(deletedId, 'tag-1');
  assert.deepEqual(result, { id: 'tag-1', deleted: true, affectedProducts: 3 });
});
