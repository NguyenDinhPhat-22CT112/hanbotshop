import { BadRequestException, ConflictException, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaService } from '../../modules/prisma/prisma.service';

type IdempotentOperation<T> = {
  key: string | undefined;
  method: string;
  path: string;
  actorId?: string;
  requestBody: unknown;
  responseStatus?: number;
  handler: () => Promise<T>;
};

@Injectable()
export class IdempotencyService implements OnModuleInit, OnModuleDestroy {
  private cleanupTimer: NodeJS.Timeout | undefined;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.cleanupTimer = setInterval(() => {
      void this.cleanupExpired();
    }, 60 * 60 * 1000);
    this.cleanupTimer.unref();
    void this.cleanupExpired();
  }

  onModuleDestroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }

  async run<T>(operation: IdempotentOperation<T>): Promise<T> {
    const key = this.normalizeKey(operation.key);
    const scope = this.buildScope(operation);
    const requestHash = this.hash(operation.requestBody);
    const existingRecord = await this.findRecord(scope, key);

    if (existingRecord) {
      return this.replayOrReject<T>(existingRecord, requestHash);
    }

    const reservation = await this.createRecordOrReplay<T>(operation, scope, key, requestHash);

    if (reservation.kind === 'response') {
      return reservation.response;
    }

    const record = reservation.record;

    try {
      const response = await operation.handler();
      await this.prisma.idempotencyRecord.update({
        where: { id: record.id },
        data: {
          responseStatus: operation.responseStatus ?? 200,
          responseBody: this.toJsonValue(response)
        }
      });

      return response;
    } catch (error) {
      await this.prisma.idempotencyRecord.delete({ where: { id: record.id } }).catch(() => undefined);
      throw error;
    }
  }

  async cleanupExpired() {
    await this.prisma.idempotencyRecord.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    });
  }

  private async findRecord(scope: string, key: string) {
    return this.prisma.idempotencyRecord.findUnique({
      where: {
        scope_key: {
          scope,
          key
        }
      }
    });
  }

  private replayOrReject<T>(
    record: NonNullable<Awaited<ReturnType<IdempotencyService['findRecord']>>>,
    requestHash: string
  ) {
    if (record.requestHash !== requestHash) {
      throw new ConflictException('Idempotency key was already used with a different request payload.');
    }

    if (record.responseBody !== null) {
      return record.responseBody as T;
    }

    throw new ConflictException('Request with this idempotency key is already being processed.');
  }

  private async createRecordOrReplay<T>(
    operation: IdempotentOperation<T>,
    scope: string,
    key: string,
    requestHash: string
  ) {
    try {
      const record = await this.prisma.idempotencyRecord.create({
        data: {
          key,
          scope,
          method: operation.method,
          path: operation.path,
          actorId: operation.actorId,
          requestHash,
          expiresAt: this.expiresAt()
        }
      });

      return { kind: 'record' as const, record };
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        const existingRecord = await this.findRecord(scope, key);

        if (existingRecord) {
          return {
            kind: 'response' as const,
            response: this.replayOrReject<T>(existingRecord, requestHash)
          };
        }
      }

      throw error;
    }
  }

  private isUniqueConstraintError(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }

  private normalizeKey(key: string | undefined) {
    const normalized = key?.trim();

    if (!normalized) {
      throw new BadRequestException('Idempotency-Key header is required for this endpoint.');
    }

    return normalized;
  }

  private buildScope(operation: Pick<IdempotentOperation<unknown>, 'method' | 'path' | 'actorId'>) {
    return `${operation.method.toUpperCase()} ${operation.path} ${operation.actorId ?? 'anonymous'}`;
  }

  private hash(value: unknown) {
    return createHash('sha256').update(JSON.stringify(value ?? null)).digest('hex');
  }

  private expiresAt() {
    const date = new Date();
    date.setHours(date.getHours() + 24);

    return date;
  }

  private toJsonValue(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value ?? { idempotencyResponseId: randomUUID() })) as Prisma.InputJsonValue;
  }
}
