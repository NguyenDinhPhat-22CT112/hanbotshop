import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  AddInternalNoteDto,
  AddProductionEventDto,
  CreateProductionJobDto,
  ProductionJobListQueryDto,
  UpdateProductionJobAssigneeDto,
  UpdateProductionJobPriorityDto,
  UpdateProductionJobStatusDto
} from './dto/production.dto';

@Injectable()
export class ProductionService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ProductionJobListQueryDto) {
    const where: Prisma.ProductionJobWhereInput = {
      status: query.status,
      orderId: query.orderId,
      priority: query.priority,
      OR: query.q
        ? [
            { title: { contains: query.q, mode: 'insensitive' } },
            { order: { orderNumber: { contains: query.q, mode: 'insensitive' } } }
          ]
        : undefined
    };
    const skip = (query.page - 1) * query.pageSize;
    const [jobs, total] = await this.prisma.$transaction([
      this.prisma.productionJob.findMany({
        where,
        skip,
        take: query.pageSize,
        orderBy: { updatedAt: 'desc' },
        include: this.jobInclude()
      }),
      this.prisma.productionJob.count({ where })
    ]);

    return {
      data: jobs.map((job) => this.serializeJob(job)),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        pageCount: Math.ceil(total / query.pageSize)
      }
    };
  }

  async get(id: string) {
    const job = await this.prisma.productionJob.findUnique({
      where: { id },
      include: this.jobInclude()
    });

    if (!job) {
      throw new NotFoundException('Production job not found.');
    }

    return this.serializeJob(job);
  }

  async create(dto: CreateProductionJobDto) {
    await this.ensureOrderExists(dto.orderId);
    const job = await this.prisma.productionJob.create({
      data: {
        orderId: dto.orderId,
        title: dto.title,
        status: dto.status,
        events: {
          create: {
            status: dto.status,
            note: dto.note ?? null
          }
        }
      },
      include: this.jobInclude()
    });

    return this.serializeJob(job);
  }

  async updateStatus(id: string, dto: UpdateProductionJobStatusDto) {
    await this.ensureJobExists(id);
    const job = await this.prisma.productionJob.update({
      where: { id },
      data: {
        status: dto.status,
        events: {
          create: {
            status: dto.status,
            note: dto.note ?? null
          }
        }
      },
      include: this.jobInclude()
    });

    return this.serializeJob(job);
  }

  async updateAssignee(id: string, dto: UpdateProductionJobAssigneeDto) {
    await this.ensureJobExists(id);

    const job = await this.prisma.productionJob.update({
      where: { id },
      data: {
        assigneeId: dto.assigneeId ?? null
      },
      include: this.jobInclude()
    });

    return this.serializeJob(job);
  }

  async updatePriority(id: string, dto: UpdateProductionJobPriorityDto) {
    await this.ensureJobExists(id);

    const job = await this.prisma.productionJob.update({
      where: { id },
      data: {
        priority: dto.priority
      },
      include: this.jobInclude()
    });

    return this.serializeJob(job);
  }

  async addEvent(id: string, dto: AddProductionEventDto) {
    await this.ensureJobExists(id);
    const job = await this.prisma.productionJob.update({
      where: { id },
      data: {
        status: dto.status,
        events: {
          create: {
            status: dto.status,
            note: dto.note ?? null
          }
        }
      },
      include: this.jobInclude()
    });

    return this.serializeJob(job);
  }

  async addInternalNote(id: string, dto: AddInternalNoteDto) {
    await this.ensureJobExists(id);
    const note = await this.prisma.internalNote.create({
      data: {
        productionJobId: id,
        body: dto.body
      }
    });

    return note;
  }

  async listInternalNotes(id: string) {
    await this.ensureJobExists(id);
    const notes = await this.prisma.internalNote.findMany({
      where: { productionJobId: id },
      orderBy: { createdAt: 'desc' }
    });

    return { data: notes };
  }

  async getTimeline(id: string) {
    const job = await this.prisma.productionJob.findUnique({
      where: { id },
      include: {
        events: {
          orderBy: { createdAt: 'asc' }
        },
        internalNotes: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            createdAt: true,
            updatedAt: true
          }
        }
      }
    });

    if (!job) {
      throw new NotFoundException('Production job not found.');
    }

    return {
      data: [
        { type: 'PRODUCTION_JOB_CREATED', status: job.status, createdAt: job.createdAt },
        ...job.events.map((event) => ({
          type: 'PRODUCTION_STATUS_CHANGED',
          status: event.status,
          note: event.note,
          createdAt: event.createdAt
        })),
        ...job.internalNotes.map((note) => ({
          type: 'INTERNAL_NOTE_ADDED',
          noteId: note.id,
          createdAt: note.createdAt
        }))
      ].sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
    };
  }

  private async ensureOrderExists(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });

    if (!order) {
      throw new NotFoundException('Order not found.');
    }
  }

  private async ensureJobExists(id: string) {
    const job = await this.prisma.productionJob.findUnique({ where: { id } });

    if (!job) {
      throw new NotFoundException('Production job not found.');
    }

    return job;
  }

  private jobInclude() {
    return {
      order: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
          paymentStatus: true
        }
      },
      events: {
        orderBy: { createdAt: 'desc' as const }
      },
      internalNotes: {
        orderBy: { createdAt: 'desc' as const }
      }
    };
  }

  private serializeJob(job: Prisma.ProductionJobGetPayload<{ include: ReturnType<ProductionService['jobInclude']> }>) {
    return job;
  }
}
