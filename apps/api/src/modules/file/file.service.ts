import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { FileUploadStatus, UserRole } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateFileDto } from './dto/file.dto';

type Actor = {
  id: string;
  role: UserRole;
};

@Injectable()
export class FileService {
  constructor(private readonly prisma: PrismaService) {}

  async createUploadIntent(actor: Actor, dto: CreateFileDto) {
    const storageProvider = process.env.CLOUD_STORAGE_PROVIDER || 's3-compatible';
    const storageKey = `uploads/${actor.id}/${randomUUID()}-${this.safeStorageName(dto.originalName)}`;
    let file = await this.prisma.file.create({
      data: {
        ownerId: actor.id,
        originalName: dto.originalName,
        mimeType: dto.mimeType,
        size: dto.size,
        storageProvider,
        storageKey,
        isPublic: dto.isPublic,
        url: null
      }
    });
    if (dto.isPublic) {
      file = await this.prisma.file.update({ where: { id: file.id }, data: { url: this.publicUrlFor(storageKey) } });
    }

    const contentDisposition = this.contentDispositionFor(dto.mimeType);

    return {
      file,
      upload: {
        method: 'PUT',
        url: await this.createPresignedPutUrl(storageKey, dto.mimeType),
        headers: {
          'content-type': dto.mimeType,
          'content-disposition': contentDisposition
        },
        storageProvider,
        expiresInSeconds: 900
      }
    };
  }

  async listFiles(actor: Actor) {
    const where = actor.role === UserRole.ADMIN ? undefined : { ownerId: actor.id };
    const files = await this.prisma.file.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    return { data: files };
  }

  async getFile(actor: Actor, id: string) {
    const file = await this.prisma.file.findUnique({ where: { id } });

    if (!file) {
      throw new NotFoundException('File not found.');
    }

    if (!file.isPublic && actor.role !== UserRole.ADMIN && file.ownerId !== actor.id) {
      throw new ForbiddenException('You do not have permission to access this file.');
    }

    return file;
  }

  async confirmUpload(actor: Actor, id: string) {
    const file = await this.getFile(actor, id);

    if (!file.isPublic && actor.role !== UserRole.ADMIN && file.ownerId !== actor.id) {
      throw new ForbiddenException('You do not have permission to confirm this file.');
    }

    await this.ensureUploadedObjectExists(file.storageKey, file.mimeType, file.size);

    return this.prisma.file.update({
      where: { id },
      data: {
        uploadStatus: FileUploadStatus.CONFIRMED,
        confirmedAt: new Date()
      }
    });
  }

  async deleteFile(actor: Actor, id: string) {
    if (actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only administrators can delete files.');
    }

    const file = await this.prisma.file.findUnique({ where: { id } });

    if (!file) {
      throw new NotFoundException('File not found.');
    }

    const [productImageCount, printRequestCount] = await Promise.all([
      this.prisma.productImage.count({
        where: file.url
          ? {
              OR: [{ fileId: file.id }, { url: file.url }]
            }
          : { fileId: file.id }
      }),
      file.url
        ? this.prisma.printRequest.count({
            where: {
              imageUrls: {
                has: file.url
              }
            }
          })
        : Promise.resolve(0)
    ]);

    if (productImageCount > 0 || printRequestCount > 0) {
      throw new ConflictException(
        'File is currently in use. Remove it from the related product or print request before deleting it.'
      );
    }

    const { bucket, client } = this.storageClient();
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: file.storageKey
      })
    );
    await this.prisma.file.delete({ where: { id: file.id } });

    return {
      id: file.id,
      deleted: true,
      cloudObjectDeleted: true
    };
  }

  async getPublicObject(storageKey: string) {
    const file = await this.prisma.file.findFirst({ where: { storageKey } });
    if (!file?.isPublic || file.uploadStatus !== FileUploadStatus.CONFIRMED) throw new NotFoundException('Public file not found.');
    const { bucket, client } = this.storageClient();
    const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: storageKey }));
    if (!object.Body) throw new NotFoundException('Public file content not found.');
    return { bytes: Buffer.from(await object.Body.transformToByteArray()), mimeType: object.ContentType || file.mimeType };
  }

  private publicUrlFor(storageKey: string) {
    const apiUrl = (process.env.PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1').replace(/\/$/, '');
    return `${apiUrl}/files/public?key=${encodeURIComponent(storageKey)}`;
  }

  private async createPresignedPutUrl(storageKey: string, contentType: string) {
    const { bucket, client } = this.storageClient();
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: storageKey,
      ContentType: contentType,
      ContentDisposition: this.contentDispositionFor(contentType)
    });

    return getSignedUrl(client, command, { expiresIn: 900 });
  }

  private async ensureUploadedObjectExists(storageKey: string, contentType: string, size: number) {
    const { bucket, client } = this.storageClient();

    try {
      const object = await client.send(
        new HeadObjectCommand({
          Bucket: bucket,
          Key: storageKey
        })
      );

      if (object.ContentLength !== undefined && object.ContentLength !== size) {
        throw new ConflictException('Uploaded file size does not match the upload intent.');
      }

      if (object.ContentType && object.ContentType !== contentType) {
        throw new ConflictException('Uploaded file content type does not match the upload intent.');
      }
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }

      throw new ConflictException('Uploaded object was not found in cloud storage.');
    }
  }

  private storageClient() {
    const endpoint = this.requiredEnv('CLOUD_STORAGE_ENDPOINT').replace(/\/$/, '');
    const bucket = this.requiredEnv('CLOUD_STORAGE_BUCKET');
    const accessKeyId = this.requiredEnv('CLOUD_STORAGE_ACCESS_KEY_ID');
    const secretAccessKey = this.requiredEnv('CLOUD_STORAGE_SECRET_ACCESS_KEY');
    const region = process.env.CLOUD_STORAGE_REGION || 'auto';
    const client = new S3Client({
      region,
      endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    });

    return { bucket, client };
  }

  private requiredEnv(name: string) {
    const value = process.env[name];

    if (!value) {
      throw new Error(`${name} is required for cloud storage uploads.`);
    }

    return value;
  }

  private contentDispositionFor(contentType: string) {
    return contentType.startsWith('image/') ? 'inline' : 'attachment';
  }

  private safeStorageName(originalName: string) {
    return originalName
      .replace(/[/\\]/g, '-')
      .replace(/[^\p{L}\p{N}._-]+/gu, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120) || 'upload';
  }
}
