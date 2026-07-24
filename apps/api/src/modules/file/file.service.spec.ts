import { ConflictException } from '@nestjs/common';
import { FileUploadStatus, UserRole } from '@prisma/client';
import assert from 'node:assert/strict';
import test from 'node:test';
import { FileService } from './file.service';

function createService(objectHead: { ContentLength?: number; ContentType?: string } | Error) {
  const file = {
    id: 'file-1',
    ownerId: 'user-1',
    originalName: 'image.jpg',
    mimeType: 'image/jpeg',
    size: 123,
    storageProvider: 's3-compatible',
    storageKey: 'uploads/user-1/image.jpg',
    url: null,
    isPublic: false,
    uploadStatus: FileUploadStatus.PENDING,
    confirmedAt: null,
    createdAt: new Date()
  };
  const prisma = {
    file: {
      findUnique: async () => file,
      update: async ({ data }: { data: Partial<typeof file> }) => ({ ...file, ...data })
    }
  };
  const service = new FileService(prisma as never);

  (service as unknown as { storageClient: () => { bucket: string; client: { send: () => Promise<unknown> } } }).storageClient =
    () => ({
      bucket: 'bucket',
      client: {
        send: async () => {
          if (objectHead instanceof Error) {
            throw objectHead;
          }

          return objectHead;
        }
      }
    });

  return service;
}

test('FileService confirms upload after object storage HEAD matches intent', async () => {
  const service = createService({ ContentLength: 123, ContentType: 'image/jpeg' });
  const result = await service.confirmUpload({ id: 'user-1', role: UserRole.CUSTOMER }, 'file-1');

  assert.equal(result.uploadStatus, FileUploadStatus.CONFIRMED);
  assert.ok(result.confirmedAt);
});

test('FileService rejects upload confirm when object size mismatches intent', async () => {
  const service = createService({ ContentLength: 999, ContentType: 'image/jpeg' });

  await assert.rejects(
    () => service.confirmUpload({ id: 'user-1', role: UserRole.CUSTOMER }, 'file-1'),
    ConflictException
  );
});

test('FileService rejects upload confirm when object is missing', async () => {
  const service = createService(new Error('missing'));

  await assert.rejects(
    () => service.confirmUpload({ id: 'user-1', role: UserRole.CUSTOMER }, 'file-1'),
    ConflictException
  );
});
