import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type Actor = {
  id: string;
  role: UserRole;
};

@Injectable()
export class OrderTimelineService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrderTimeline(actor: Actor, id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        events: { orderBy: { createdAt: 'asc' } },
        payments: { include: { events: true } }
      }
    });

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    this.assertCanAccessOrder(actor, order.userId);

    const paymentEvents = order.payments.flatMap((payment) =>
      payment.events.map((event) => ({
        type: event.type,
        paymentId: payment.id,
        createdAt: event.createdAt
      }))
    );

    const orderEvents = order.events.map((event) => ({
      type: event.type,
      actorId: event.actorId,
      payload: event.payload,
      createdAt: event.createdAt
    }));

    return {
      data: [...orderEvents, ...paymentEvents].sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
    };
  }

  private assertCanAccessOrder(actor: Actor, orderUserId: string) {
    if (actor.role !== UserRole.ADMIN && actor.id !== orderUserId) {
      throw new ForbiddenException('You do not have permission to access this order.');
    }
  }
}
