import { Injectable } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../modules/prisma/prisma.service';

type AuditRecordInput = {
  actorId?: string;
  action: AuditAction;
  resourceType: string;
  resourceId: string;
  before?: unknown;
  after?: unknown;
  metadata?: unknown;
};

type AuditListInput = {
  page: number;
  pageSize: number;
  action?: AuditAction;
  actorId?: string;
  resourceType?: string;
  resourceId?: string;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  record(input: AuditRecordInput) {
    return this.prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        before: this.toJson(input.before),
        after: this.toJson(input.after),
        metadata: this.toJson(input.metadata)
      }
    });
  }

  async list(input: AuditListInput) {
    const where: Prisma.AuditLogWhereInput = {
      action: input.action,
      actorId: input.actorId,
      resourceType: input.resourceType,
      resourceId: input.resourceId
    };
    const skip = (input.page - 1) * input.pageSize;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: input.pageSize,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.auditLog.count({ where })
    ]);

    return {
      data,
      meta: {
        page: input.page,
        pageSize: input.pageSize,
        total,
        pageCount: Math.ceil(total / input.pageSize)
      }
    };
  }

  private toJson(value: unknown): Prisma.InputJsonValue | undefined {
    if (value === undefined) {
      return undefined;
    }

    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
