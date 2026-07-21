import { Injectable } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type NotificationInput = {
  userId: string;
  email: string;
  orderId: string;
  orderNumber: string;
  type: NotificationType;
  title: string;
  body: string;
  dedupeKey: string;
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async enqueue(tx: Prisma.TransactionClient, input: NotificationInput) {
    await tx.notification.upsert({
      where: { dedupeKey: input.dedupeKey },
      update: {},
      create: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        dedupeKey: input.dedupeKey,
        data: { orderId: input.orderId, orderNumber: input.orderNumber }
      }
    });
    await tx.emailOutbox.upsert({
      where: { dedupeKey: input.dedupeKey },
      update: {},
      create: {
        userId: input.userId,
        orderId: input.orderId,
        to: input.email,
        subject: input.title,
        html: this.emailHtml(input.title, input.body, input.orderNumber),
        dedupeKey: input.dedupeKey
      }
    });
  }

  async list(userId: string, unreadOnly = false) {
    const data = await this.prisma.notification.findMany({
      where: { userId, readAt: unreadOnly ? null : undefined },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    const unreadCount = await this.prisma.notification.count({ where: { userId, readAt: null } });

    return { data, unreadCount };
  }

  async markRead(userId: string, id: string) {
    await this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() }
    });

    return { success: true };
  }

  private emailHtml(title: string, body: string, orderNumber: string) {
    return `<h1>${this.escape(title)}</h1><p>${this.escape(body)}</p><p>Mã đơn: <strong>${this.escape(orderNumber)}</strong></p>`;
  }

  private escape(value: string) {
    return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char);
  }
}
