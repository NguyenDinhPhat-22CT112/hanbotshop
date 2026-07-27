import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import {
  AuditAction,
  OrderEventType,
  OrderStatus,
  OrderType,
  PaymentEventType,
  PaymentStatus,
  Prisma,
  UserRole
} from '@prisma/client';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { CheckoutSessionDto, ManualReceiptDto, PaymentWebhookDto } from './dto/payment.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '@prisma/client';

type Actor = {
  id: string;
  role: UserRole;
};

type WebhookHeaders = {
  signature?: string;
  providerEventId?: string;
  providerTimestamp?: string;
  rawBody?: string;
};

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService = { enqueue: async () => undefined } as unknown as NotificationsService
  ) {}

  async createCheckoutSession(actor: Actor, dto: CheckoutSessionDto) {
    return this.prisma.$transaction(
      async (tx) => {
        const order = await tx.order.findUnique({
          where: { id: dto.orderId },
          include: {
            payments: {
              where: { status: PaymentStatus.UNPAID },
              orderBy: { createdAt: 'desc' },
              include: this.paymentInclude()
            }
          }
        });

        if (!order) {
          throw new NotFoundException('Order not found.');
        }

        if (actor.role !== UserRole.ADMIN && order.userId !== actor.id) {
          throw new ForbiddenException('You do not have permission to pay this order.');
        }

        this.assertOrderCanCreatePayment(order.type, order.status, order.paymentStatus);
        const provider = this.getProvider();
        const amountDue = this.paymentAmountDue(order);

        if (amountDue.lessThanOrEqualTo(0)) {
          throw new BadRequestException('The order has no outstanding amount to pay.');
        }

        const existingPayment = order.payments.find(
          (payment) => payment.provider === provider && payment.amount.equals(amountDue)
        );

        if (existingPayment) {
          return this.checkoutSessionResponse(existingPayment);
        }

        const transferContent = this.transferContent(order.orderNumber);

        const payment = await tx.payment.create({
          data: {
            orderId: order.id,
            provider,
            providerReference: transferContent,
            amount: amountDue,
            status: PaymentStatus.UNPAID,
            payload: this.bankTransferDetails(transferContent),
            events: {
              create: {
                type: PaymentEventType.CHECKOUT_CREATED,
                payload: {
                  orderId: order.id,
                  amount: amountDue.toString()
                }
              }
            }
          },
          include: this.paymentInclude()
        });

        return this.checkoutSessionResponse(payment);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }

  private assertOrderCanCreatePayment(
    type: OrderType,
    status: OrderStatus,
    paymentStatus: PaymentStatus
  ) {
    if (paymentStatus !== PaymentStatus.UNPAID && paymentStatus !== PaymentStatus.PARTIALLY_PAID) {
      throw new BadRequestException('A payment session cannot be created for a fully paid order.');
    }

    const payableStatuses: OrderStatus[] = type === OrderType.ORDER
      ? [OrderStatus.WAITING_DEPOSIT, OrderStatus.WAITING_SECOND_PAYMENT]
      : [
          OrderStatus.PENDING_CONFIRMATION,
          OrderStatus.CONFIRMED,
          OrderStatus.WAITING_PAYMENT
        ];

    if (!payableStatuses.includes(status)) {
      throw new BadRequestException('The order is not in a payable state.');
    }
  }

  private paymentAmountDue(order: {
    type: OrderType;
    status: OrderStatus;
    total: Prisma.Decimal;
    depositRequired: Prisma.Decimal;
    secondPaymentRequired: Prisma.Decimal;
    paidAmount: Prisma.Decimal;
  }) {
    if (order.type === OrderType.ORDER) {
      if (order.status === OrderStatus.WAITING_DEPOSIT) {
        const depositTarget = order.depositRequired.greaterThan(0)
          ? order.depositRequired
          : order.total;

        return depositTarget.minus(order.paidAmount);
      }

      return Prisma.Decimal.min(
        order.secondPaymentRequired,
        order.total.minus(order.paidAmount)
      );
    }

    const firstPaymentTarget = order.depositRequired.greaterThan(0)
      ? order.depositRequired
      : order.total;

    return order.paidAmount.lessThan(firstPaymentTarget)
      ? firstPaymentTarget.minus(order.paidAmount)
      : order.total.minus(order.paidAmount);
  }

  private checkoutSessionResponse(
    payment: Prisma.PaymentGetPayload<{ include: ReturnType<PaymentService['paymentInclude']> }>
  ) {
    return {
      payment: this.serializePayment(payment),
      checkoutUrl: `/checkout/bank-transfer?paymentId=${payment.id}`
    };
  }

  async confirmManualTransfer(actor: Actor, id: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id }, include: { order: true } });

    if (!payment) {
      throw new NotFoundException('Payment not found.');
    }

    if (payment.provider !== 'manual_bank_transfer') {
      throw new BadRequestException('Only manual bank transfers can be confirmed manually.');
    }

    if (payment.status !== PaymentStatus.UNPAID) {
      throw new BadRequestException('This payment is no longer awaiting confirmation.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.payment.updateMany({
        where: { id, status: PaymentStatus.UNPAID },
        data: { status: PaymentStatus.PAID }
      });

      if (claimed.count !== 1) {
        throw new BadRequestException('This payment is no longer awaiting confirmation.');
      }

      await tx.paymentEvent.create({
        data: {
          paymentId: id,
          type: PaymentEventType.PAYMENT_CONFIRMED,
          payload: { confirmationMode: 'manual', confirmedBy: actor.id }
        }
      });
      const paidAmount = payment.order.paidAmount.plus(payment.amount);
      const orderPaymentStatus = paidAmount.greaterThanOrEqualTo(payment.order.total)
        ? PaymentStatus.PAID
        : PaymentStatus.PARTIALLY_PAID;
      const nextOrderStatus = this.orderStatusAfterPayment(
        payment.order.type,
        payment.order.status
      );
      await tx.order.update({
        where: { id: payment.orderId },
        data: {
          paidAmount,
          paymentStatus: orderPaymentStatus,
          status: nextOrderStatus
        }
      });

      await tx.orderEvent.create({
        data: {
          orderId: payment.orderId,
          actorId: actor.id,
          type: OrderEventType.PAYMENT_STATUS_CHANGED,
          payload: { before: payment.order.paymentStatus, after: orderPaymentStatus, paymentId: id, paidAmount: paidAmount.toString() }
        }
      });
      if (nextOrderStatus !== payment.order.status) {
        await tx.orderEvent.create({
          data: {
            orderId: payment.orderId,
            actorId: actor.id,
            type: OrderEventType.STATUS_CHANGED,
            payload: { before: payment.order.status, after: nextOrderStatus, paymentId: id }
          }
        });
      }
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: AuditAction.PAYMENT_STATUS_CHANGE,
          resourceType: 'Payment',
          resourceId: id,
          before: { status: PaymentStatus.UNPAID },
          after: { status: PaymentStatus.PAID, orderId: payment.orderId },
          metadata: { confirmationMode: 'manual_bank_transfer' }
        }
      });

      const user = await tx.user.findUnique({ where: { id: payment.order.userId }, select: { email: true } });
      if (user) {
        await this.notifications.enqueue(tx, {
          userId: payment.order.userId,
          email: user.email,
          orderId: payment.orderId,
          orderNumber: payment.order.orderNumber,
          type: NotificationType.PAYMENT_CONFIRMED,
          title: `Đã xác nhận thanh toán ${payment.order.orderNumber}`,
          body: nextOrderStatus === OrderStatus.DEPOSIT_PAID
            ? 'Khoản đặt cọc đã được xác nhận. Đơn đang chờ hàng về.'
            : nextOrderStatus === OrderStatus.SECOND_PAYMENT_PAID
              ? `Đã xác nhận thanh toán đợt 2. Còn lại ${Prisma.Decimal.max(payment.order.total.minus(paidAmount), new Prisma.Decimal(0)).toString()} VND.`
              : orderPaymentStatus === PaymentStatus.PAID
                ? 'Đơn hàng đã được thanh toán đủ.'
                : 'Khoản thanh toán đã được xác nhận.',
          dedupeKey: `payment-confirmed:${id}`
        });
      }

      const result = await tx.payment.findUnique({ where: { id }, include: this.paymentInclude() });

      if (!result) {
        throw new NotFoundException('Payment not found.');
      }

      return result;
    });

    return this.serializePayment(updated);
  }

  private orderStatusAfterPayment(type: OrderType, status: OrderStatus) {
    if (type !== OrderType.ORDER) {
      return status;
    }

    if (status === OrderStatus.WAITING_DEPOSIT) {
      return OrderStatus.DEPOSIT_PAID;
    }

    if (status === OrderStatus.WAITING_SECOND_PAYMENT) {
      return OrderStatus.SECOND_PAYMENT_PAID;
    }

    return status;
  }

  async recordManualReceipt(actor: Actor, dto: ManualReceiptDto) {
    if (actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only administrators can record a manual receipt.');
    }

    const order = await this.prisma.order.findUnique({ where: { id: dto.orderId } });

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    if (order.type !== OrderType.ORDER || order.status !== OrderStatus.SHIPPING) {
      throw new BadRequestException('COD receipts can only be recorded while an Order purchase is shipping.');
    }

    const amount = new Prisma.Decimal(dto.amount).toDecimalPlaces(2);
    const remainingAmount = order.total.minus(order.paidAmount);

    if (amount.greaterThan(remainingAmount)) {
      throw new BadRequestException('The received amount cannot exceed the remaining order balance.');
    }

    const updatedPayment = await this.prisma.$transaction(async (tx) => {
      const paidAmount = order.paidAmount.plus(amount);
      const orderPaymentStatus = paidAmount.greaterThanOrEqualTo(order.total)
        ? PaymentStatus.PAID
        : PaymentStatus.PARTIALLY_PAID;

      await tx.order.update({
        where: { id: order.id },
        data: { paidAmount, paymentStatus: orderPaymentStatus }
      });

      const payment = await tx.payment.create({
        data: {
          orderId: order.id,
          provider: 'cash_on_delivery',
          providerReference: `COD ${order.orderNumber}`,
          amount,
          status: PaymentStatus.PAID,
          payload: {
            confirmationMode: 'cash_on_delivery',
            note: dto.note,
            confirmedBy: actor.id
          },
          events: {
            create: {
              type: PaymentEventType.PAYMENT_CONFIRMED,
              payload: {
                confirmationMode: 'cash_on_delivery',
                confirmedBy: actor.id
              }
            }
          }
        }
      });

      await tx.orderEvent.create({
        data: {
          orderId: order.id,
          actorId: actor.id,
          type: OrderEventType.PAYMENT_STATUS_CHANGED,
          payload: {
            before: order.paymentStatus,
            after: orderPaymentStatus,
            paymentId: payment.id,
            paidAmount: paidAmount.toString()
          }
        }
      });

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: AuditAction.PAYMENT_STATUS_CHANGE,
          resourceType: 'Payment',
          resourceId: payment.id,
          before: { paidAmount: order.paidAmount.toString() },
          after: {
            paidAmount: paidAmount.toString(),
            paymentStatus: orderPaymentStatus,
            orderId: order.id
          },
          metadata: { confirmationMode: 'cash_on_delivery' }
        }
      });

      const result = await tx.payment.findUnique({
        where: { id: payment.id },
        include: this.paymentInclude()
      });

      if (!result) {
        throw new NotFoundException('Payment not found.');
      }

      return result;
    });

    return this.serializePayment(updatedPayment);
  }

  private getProvider() {
    const provider = process.env.PAYMENT_GATEWAY_PROVIDER?.trim() || 'manual_bank_transfer';

    if (provider !== 'manual_bank_transfer') {
      throw new BadRequestException(`Payment provider '${provider}' is not implemented.`);
    }

    return provider;
  }

  private transferContent(orderNumber: string) {
    const prefix = process.env.BANK_TRANSFER_CONTENT_PREFIX?.trim() || 'HANBOT';

    return `${prefix} ${orderNumber}`.replace(/[^A-Za-z0-9 -]/g, '').replace(/\s+/g, ' ').trim();
  }

  private bankTransferDetails(transferContent: string | null) {
    const values: Record<string, string> = {
      providerMode: 'manual_bank_transfer'
    };
    const configuredValues = {
      bankCode: process.env.BANK_TRANSFER_BANK_CODE,
      bankName: process.env.BANK_TRANSFER_BANK_NAME,
      accountNumber: process.env.BANK_TRANSFER_ACCOUNT_NUMBER,
      accountName: process.env.BANK_TRANSFER_ACCOUNT_NAME,
      qrUrl: process.env.BANK_TRANSFER_QR_URL,
      instructions: process.env.BANK_TRANSFER_INSTRUCTIONS
    };

    for (const [key, value] of Object.entries(configuredValues)) {
      if (value?.trim()) {
        values[key] = value.trim();
      }
    }

    if (transferContent) {
      values.transferContent = transferContent;
    }

    return values;
  }

  async getPayment(actor: Actor, id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: this.paymentInclude()
    });

    if (!payment) {
      throw new NotFoundException('Payment not found.');
    }

    if (actor.role !== UserRole.ADMIN && payment.order.userId !== actor.id) {
      throw new ForbiddenException('You do not have permission to access this payment.');
    }

    return this.serializePayment(payment);
  }

  async recordWebhook(dto: PaymentWebhookDto, headers: WebhookHeaders) {
    const provider = process.env.PAYMENT_GATEWAY_PROVIDER?.trim() || 'manual_bank_transfer';

    if (provider === 'manual_bank_transfer') {
      throw new BadRequestException('Webhooks are disabled for manual bank transfers.');
    }

    this.verifyWebhook(dto, headers);
    const existingEvent = await this.prisma.paymentEvent.findUnique({
      where: { providerEventId: headers.providerEventId }
    });

    if (existingEvent) {
      return this.getPaymentForWebhook(dto.paymentId);
    }

    const payment = await this.prisma.payment.findUnique({ where: { id: dto.paymentId } });

    if (!payment) {
      throw new NotFoundException('Payment not found.');
    }

    const eventType = this.toPaymentEventType(dto.event);
    try {
      const updatedPayment = await this.prisma.payment.update({
        where: { id: dto.paymentId },
        data: {
          status: eventType === PaymentEventType.PAYMENT_CONFIRMED ? PaymentStatus.PAID : undefined,
          events: {
            create: {
              type: eventType,
              providerEventId: headers.providerEventId,
              payload: {
                ...dto.payload,
                providerTimestamp: headers.providerTimestamp,
                rawBody: headers.rawBody
              } as Prisma.InputJsonValue
            }
          },
          order:
            eventType === PaymentEventType.PAYMENT_CONFIRMED
              ? {
                  update: {
                    paymentStatus: PaymentStatus.PAID
                  }
                }
              : undefined
        },
        include: this.paymentInclude()
      });

      return this.serializePayment(updatedPayment);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        return this.getPaymentForWebhook(dto.paymentId);
      }

      throw error;
    }
  }

  private async getPaymentForWebhook(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: this.paymentInclude()
    });

    if (!payment) {
      throw new NotFoundException('Payment not found.');
    }

    return this.serializePayment(payment);
  }

  private toPaymentEventType(event: string) {
    if (event === 'payment.confirmed') {
      return PaymentEventType.PAYMENT_CONFIRMED;
    }

    if (event === 'payment.failed') {
      return PaymentEventType.PAYMENT_FAILED;
    }

    return PaymentEventType.WEBHOOK_RECEIVED;
  }

  private verifyWebhook(dto: PaymentWebhookDto, headers: WebhookHeaders) {
    if (!headers.providerEventId?.trim()) {
      throw new BadRequestException('Missing provider webhook event ID.');
    }

    if (!headers.providerTimestamp?.trim()) {
      throw new BadRequestException('Missing provider webhook timestamp.');
    }

    this.verifyWebhookTimestamp(headers.providerTimestamp);
    this.verifyWebhookSignature(dto, headers);
  }

  private verifyWebhookTimestamp(timestamp: string) {
    const seconds = Number(timestamp);

    if (!Number.isFinite(seconds)) {
      throw new BadRequestException('Invalid provider webhook timestamp.');
    }

    const eventTime = seconds * 1000;
    const allowedSkewMs = 5 * 60 * 1000;

    if (Math.abs(Date.now() - eventTime) > allowedSkewMs) {
      throw new UnauthorizedException('Payment webhook timestamp is outside the allowed replay window.');
    }
  }

  private verifyWebhookSignature(dto: PaymentWebhookDto, headers: WebhookHeaders) {
    const secret = process.env.PAYMENT_GATEWAY_WEBHOOK_SECRET;

    if (!secret) {
      if (process.env.NODE_ENV === 'production') {
        throw new UnauthorizedException('Payment webhook secret is not configured.');
      }

      return;
    }

    if (!headers.signature) {
      throw new UnauthorizedException('Missing payment webhook signature.');
    }

    if (!headers.rawBody) {
      throw new UnauthorizedException('Missing raw webhook payload.');
    }

    const canonicalPayload = `${headers.providerTimestamp}.${headers.rawBody}`;
    const expectedSignature = createHmac('sha256', secret).update(canonicalPayload).digest('hex');
    const normalizedSignature = headers.signature.replace(/^sha256=/, '');
    const signatureBuffer = Buffer.from(normalizedSignature, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

    if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
      throw new UnauthorizedException('Invalid payment webhook signature.');
    }
  }

  private isUniqueConstraintError(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }

  private paymentInclude() {
    return {
      order: {
        select: {
          id: true,
          orderNumber: true,
          userId: true,
          type: true,
          status: true,
          total: true,
          depositRequired: true,
          secondPaymentRequired: true,
          paidAmount: true,
          paymentStatus: true
        }
      },
      events: {
        orderBy: { createdAt: 'desc' as const }
      }
    };
  }

  private serializePayment(payment: Prisma.PaymentGetPayload<{ include: ReturnType<PaymentService['paymentInclude']> }>) {
    const persistedPayload = payment.payload && typeof payment.payload === 'object' && !Array.isArray(payment.payload)
      ? payment.payload
      : {};

    return {
      ...payment,
      payload: payment.provider === 'manual_bank_transfer'
        ? { ...persistedPayload, ...this.bankTransferDetails(payment.providerReference) }
        : payment.payload,
      amount: payment.amount.toString(),
      order: {
        ...payment.order,
        total: payment.order.total.toString()
        ,depositRequired: payment.order.depositRequired.toString()
        ,secondPaymentRequired: payment.order.secondPaymentRequired?.toString() ?? '0'
        ,paidAmount: payment.order.paidAmount.toString()
      }
    };
  }
}
