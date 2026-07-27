import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AuditAction,
  NotificationType,
  OrderEventType,
  OrderNoteType,
  OrderStatus,
  OrderType,
  PaymentStatus,
  Prisma,
  UserRole
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import type {
  OrderListQueryDto,
  OrderNoteDto,
  SecondPaymentRequestDto,
  TrackingDto,
  UpdateOrderPaymentDto,
  UpdateOrderStatusDto
} from './dto/orders.dto';

type Actor = {
  id: string;
  role: UserRole;
};

const orderWorkflowStatuses: OrderStatus[] = [
  OrderStatus.WAITING_DEPOSIT,
  OrderStatus.DEPOSIT_PAID,
  OrderStatus.WAITING_SECOND_PAYMENT,
  OrderStatus.SECOND_PAYMENT_PAID,
  OrderStatus.SHIPPING,
  OrderStatus.COMPLETED,
  OrderStatus.CANCELLED,
  OrderStatus.BLOCKED
];

const resinWorkflowStatuses: OrderStatus[] = [
  OrderStatus.PENDING_CONFIRMATION,
  OrderStatus.CONFIRMED,
  OrderStatus.WAITING_PAYMENT,
  OrderStatus.PAID,
  OrderStatus.IN_PRODUCTION,
  OrderStatus.READY_TO_SHIP,
  OrderStatus.SHIPPED,
  OrderStatus.COMPLETED,
  OrderStatus.CANCELLED,
  OrderStatus.BLOCKED
];

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService = { enqueue: async () => undefined } as unknown as NotificationsService
  ) {}

  async listOrders(actor: Actor, query: OrderListQueryDto) {
    const where: Prisma.OrderWhereInput = {
      userId: actor.role === UserRole.ADMIN ? undefined : actor.id,
      type: query.type,
      status: query.status,
      paymentStatus: query.paymentStatus,
      OR: query.q
        ? [
            { orderNumber: { contains: query.q, mode: 'insensitive' } },
            { recipientName: { contains: query.q, mode: 'insensitive' } },
            { recipientPhone: { contains: query.q, mode: 'insensitive' } },
            { user: { email: { contains: query.q, mode: 'insensitive' } } },
            { user: { name: { contains: query.q, mode: 'insensitive' } } }
          ]
        : undefined
    };
    const skip = (query.page - 1) * query.pageSize;
    const [orders, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        skip,
        take: query.pageSize,
        orderBy: { createdAt: 'desc' },
        include: this.orderInclude()
      }),
      this.prisma.order.count({ where })
    ]);

    return {
      data: orders.map((order) => this.serializeOrder(order)),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        pageCount: Math.ceil(total / query.pageSize)
      }
    };
  }

  async getOrder(actor: Actor, id: string) {
    const order = await this.findOrderOrThrow(id);

    this.assertCanAccessOrder(actor, order.userId);

    return this.serializeOrder(order);
  }

  async updateOrderStatus(actor: Actor, id: string, dto: UpdateOrderStatusDto) {
    const before = await this.ensureOrderExists(id);
    this.assertStatusTransition(before, dto.status);

    const order = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id },
        data: { status: dto.status },
        include: this.orderInclude()
      });

      await tx.orderEvent.create({
        data: {
          orderId: id,
          actorId: actor.id,
          type: OrderEventType.STATUS_CHANGED,
          payload: { before: before.status, after: dto.status }
        }
      });

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: AuditAction.STATUS_CHANGE,
          resourceType: 'Order',
          resourceId: id,
          before: { status: before.status },
          after: { status: dto.status }
        }
      });

      const user = await tx.user.findUnique({ where: { id: before.userId }, select: { email: true } });
      if (user) {
        await this.notifications.enqueue(tx, {
          userId: before.userId,
          email: user.email,
          orderId: id,
          orderNumber: before.orderNumber,
          type: NotificationType.ORDER_STATUS_CHANGED,
          title: `Đơn ${before.orderNumber} đã cập nhật`,
          body: `Trạng thái mới: ${dto.status}.`,
          dedupeKey: `order-status:${id}:${dto.status}:${updated.updatedAt.toISOString()}`
        });
      }

      return updated;
    });

    return this.serializeOrder(order);
  }

  async updateOrderPayment(actor: Actor, id: string, dto: UpdateOrderPaymentDto) {
    if (dto.paymentStatus === PaymentStatus.PAID || dto.paymentStatus === PaymentStatus.PARTIALLY_PAID) {
      throw new BadRequestException('Confirm incoming money through the specific payment record.');
    }

    const before = await this.ensureOrderExists(id);

    const order = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id },
        data: { paymentStatus: dto.paymentStatus },
        include: this.orderInclude()
      });

      await tx.orderEvent.create({
        data: {
          orderId: id,
          actorId: actor.id,
          type: OrderEventType.PAYMENT_STATUS_CHANGED,
          payload: { before: before.paymentStatus, after: dto.paymentStatus }
        }
      });

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: AuditAction.PAYMENT_STATUS_CHANGE,
          resourceType: 'Order',
          resourceId: id,
          before: { paymentStatus: before.paymentStatus },
          after: { paymentStatus: dto.paymentStatus }
        }
      });

      return updated;
    });

    return this.serializeOrder(order);
  }

  async requestSecondPayment(actor: Actor, id: string, dto: SecondPaymentRequestDto) {
    const before = await this.ensureOrderExists(id);

    if (before.type !== OrderType.ORDER) {
      throw new BadRequestException('Second-payment requests are only available for Order purchases.');
    }

    if (before.status !== OrderStatus.DEPOSIT_PAID) {
      throw new BadRequestException('The deposit must be confirmed before requesting the second payment.');
    }

    const amount = new Prisma.Decimal(dto.amount).toDecimalPlaces(2);
    const remainingAmount = before.total.minus(before.paidAmount);

    if (amount.greaterThan(remainingAmount)) {
      throw new BadRequestException('The requested second payment cannot exceed the remaining order balance.');
    }

    const order = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id },
        data: {
          secondPaymentRequired: amount,
          status: OrderStatus.WAITING_SECOND_PAYMENT
        },
        include: this.orderInclude()
      });

      await tx.orderEvent.create({
        data: {
          orderId: id,
          actorId: actor.id,
          type: OrderEventType.STATUS_CHANGED,
          payload: {
            before: before.status,
            after: OrderStatus.WAITING_SECOND_PAYMENT,
            secondPaymentRequired: amount.toString()
          }
        }
      });

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: AuditAction.STATUS_CHANGE,
          resourceType: 'Order',
          resourceId: id,
          before: { status: before.status, secondPaymentRequired: before.secondPaymentRequired.toString() },
          after: { status: OrderStatus.WAITING_SECOND_PAYMENT, secondPaymentRequired: amount.toString() }
        }
      });

      const user = await tx.user.findUnique({ where: { id: before.userId }, select: { email: true } });
      if (user) {
        await this.notifications.enqueue(tx, {
          userId: before.userId,
          email: user.email,
          orderId: id,
          orderNumber: before.orderNumber,
          type: NotificationType.ORDER_STATUS_CHANGED,
          title: `Đơn ${before.orderNumber} đã về hàng`,
          body: `Vui lòng thanh toán đợt 2: ${amount.toString()} VND.`,
          dedupeKey: `second-payment-requested:${id}:${updated.updatedAt.toISOString()}`
        });
      }

      return updated;
    });

    return this.serializeOrder(order);
  }

  async cancelOrder(actor: Actor, id: string) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: { items: true } });

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    this.assertCanAccessOrder(actor, order.userId);

    this.assertCanCancelOrder(actor, order.type, order.status, order.paymentStatus);

    const cancelledOrder = await this.prisma.$transaction(async (tx) => {
      for (const item of order.items.filter((entry) => entry.inventoryCommitted)) {
        const variantId = this.variantIdFromSnapshot(item.variantSnapshot);

        if (variantId) {
          await tx.productVariant.update({ where: { id: variantId }, data: { inventoryQuantity: { increment: item.quantity } } });
        } else if (item.productId) {
          await tx.product.update({ where: { id: item.productId }, data: { inventoryQuantity: { increment: item.quantity } } });
        }
      }

      await tx.orderItem.updateMany({
        where: { orderId: id, inventoryCommitted: true },
        data: { inventoryCommitted: false }
      });

      const updated = await tx.order.update({
        where: { id },
        data: { status: OrderStatus.CANCELLED },
        include: this.orderInclude()
      });

      await tx.orderEvent.create({
        data: {
          orderId: id,
          actorId: actor.id,
          type: OrderEventType.ORDER_CANCELLED,
          payload: { before: order.status, after: OrderStatus.CANCELLED }
        }
      });

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: AuditAction.CANCEL,
          resourceType: 'Order',
          resourceId: id,
          before: { status: order.status },
          after: { status: OrderStatus.CANCELLED }
        }
      });

      return updated;
    });

    return this.serializeOrder(cancelledOrder);
  }

  async updateTracking(actor: Actor, id: string, dto: TrackingDto) {
    const before = await this.ensureOrderExists(id);

    const order = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id },
        data: {
          trackingNumber: dto.trackingNumber,
          trackingCarrier: dto.trackingCarrier
        },
        include: this.orderInclude()
      });

      await tx.orderEvent.create({
        data: {
          orderId: id,
          actorId: actor.id,
          type: OrderEventType.TRACKING_UPDATED,
          payload: {
            before: {
              trackingNumber: before.trackingNumber,
              trackingCarrier: before.trackingCarrier
            },
            after: dto
          }
        }
      });

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: AuditAction.TRACKING_UPDATE,
          resourceType: 'Order',
          resourceId: id,
          before: {
            trackingNumber: before.trackingNumber,
            trackingCarrier: before.trackingCarrier
          },
          after: dto as Prisma.InputJsonObject
        }
      });

      return updated;
    });

    return this.serializeOrder(order);
  }

  async listNotes(id: string, type?: OrderNoteType) {
    await this.ensureOrderExists(id);

    const notes = await this.prisma.orderNote.findMany({
      where: { orderId: id, type },
      orderBy: { createdAt: 'desc' }
    });

    return { data: notes };
  }

  async addNote(actor: Actor, id: string, dto: OrderNoteDto) {
    await this.ensureOrderExists(id);

    const note = await this.prisma.$transaction(async (tx) => {
      const created = await tx.orderNote.create({
        data: {
          orderId: id,
          actorId: actor.id,
          type: dto.type,
          body: dto.body
        }
      });

      await tx.orderEvent.create({
        data: {
          orderId: id,
          actorId: actor.id,
          type: dto.type === OrderNoteType.PAYMENT ? OrderEventType.PAYMENT_NOTE_ADDED : OrderEventType.ADMIN_NOTE_ADDED,
          payload: { noteId: created.id, noteType: dto.type }
        }
      });

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: AuditAction.NOTE_ADDED,
          resourceType: 'Order',
          resourceId: id,
          after: { noteId: created.id, noteType: dto.type }
        }
      });

      return created;
    });

    return note;
  }

  async findOrderOrThrow(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: this.orderInclude()
    });

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    return order;
  }

  serializeOrder(order: Prisma.OrderGetPayload<{ include: ReturnType<OrdersService['orderInclude']> }>) {
    return {
      ...order,
      subtotal: order.subtotal.toString(),
      shippingFee: order.shippingFee.toString(),
      total: order.total.toString(),
      depositRequired: order.depositRequired.toString(),
      secondPaymentRequired: order.secondPaymentRequired.toString(),
      paidAmount: order.paidAmount.toString(),
      remainingAmount: Prisma.Decimal.max(
        order.total.minus(order.paidAmount),
        new Prisma.Decimal(0)
      ).toString(),
      items: order.items.map((item) => ({
        ...item,
        unitPrice: item.unitPrice.toString(),
        totalPrice: item.totalPrice.toString(),
        depositAmount: item.depositAmount.toString()
      })),
      payments: order.payments.map((payment) => ({
        ...payment,
        amount: payment.amount.toString()
      }))
    };
  }

  private async ensureOrderExists(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    return order;
  }

  private assertCanAccessOrder(actor: Actor, orderUserId: string) {
    if (actor.role !== UserRole.ADMIN && actor.id !== orderUserId) {
      throw new ForbiddenException('You do not have permission to access this order.');
    }
  }

  private assertCanCancelOrder(
    actor: Actor,
    type: OrderType,
    status: OrderStatus,
    paymentStatus: PaymentStatus
  ) {
    if (paymentStatus === PaymentStatus.PAID || paymentStatus === PaymentStatus.PARTIALLY_PAID) {
      throw new ForbiddenException('Paid orders cannot be refunded or cancelled. Contact Admin to transfer the order.');
    }

    if (actor.role !== UserRole.ADMIN) {
      const cancellableStatus = type === OrderType.ORDER
        ? OrderStatus.WAITING_DEPOSIT
        : OrderStatus.PENDING_CONFIRMATION;

      if (status !== cancellableStatus) {
        throw new ForbiddenException('Customers can only cancel an unpaid order before it is processed.');
      }

      return;
    }

    const terminalStatuses: OrderStatus[] = [
      OrderStatus.CANCELLED,
      OrderStatus.SHIPPED,
      OrderStatus.SHIPPING,
      OrderStatus.COMPLETED
    ];

    if (terminalStatuses.includes(status)) {
      throw new ForbiddenException('Orders in a terminal or shipped state cannot be cancelled.');
    }
  }

  private assertStatusTransition(
    order: Awaited<ReturnType<OrdersService['ensureOrderExists']>>,
    nextStatus: OrderStatus
  ) {
    const allowedStatuses = order.type === OrderType.ORDER
      ? orderWorkflowStatuses
      : resinWorkflowStatuses;

    if (!allowedStatuses.includes(nextStatus)) {
      throw new BadRequestException(`Status ${nextStatus} is not valid for ${order.type} orders.`);
    }

    if (order.type !== OrderType.ORDER || nextStatus === order.status) {
      return;
    }

    if (nextStatus === OrderStatus.DEPOSIT_PAID || nextStatus === OrderStatus.SECOND_PAYMENT_PAID) {
      throw new BadRequestException('Confirm the matching payment instead of changing this status manually.');
    }

    if (nextStatus === OrderStatus.WAITING_SECOND_PAYMENT) {
      throw new BadRequestException('Enter the second-payment amount to start this stage.');
    }

    if (nextStatus === OrderStatus.CANCELLED) {
      throw new BadRequestException('Use the cancel-order action so reserved inventory is restored safely.');
    }

    if (nextStatus === OrderStatus.SHIPPING && order.status !== OrderStatus.SECOND_PAYMENT_PAID) {
      throw new BadRequestException('The second payment must be confirmed before shipping.');
    }

    if (nextStatus === OrderStatus.COMPLETED) {
      if (order.status !== OrderStatus.SHIPPING) {
        throw new BadRequestException('Only a shipping order can be completed.');
      }

      if (order.paidAmount.lessThan(order.total)) {
        throw new BadRequestException('Record the remaining COD amount before completing the order.');
      }
    }
  }

  private variantIdFromSnapshot(snapshot: Prisma.JsonValue | null) {
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
      return undefined;
    }

    return typeof snapshot.id === 'string' ? snapshot.id : undefined;
  }

  private orderInclude() {
    return {
      user: {
        select: {
          id: true,
          email: true,
          name: true
        }
      },
      items: true,
      payments: {
        orderBy: { createdAt: 'desc' as const },
        include: {
          events: {
            orderBy: { createdAt: 'desc' as const }
          }
        }
      }
    };
  }
}
