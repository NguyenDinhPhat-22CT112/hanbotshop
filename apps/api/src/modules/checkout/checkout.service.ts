import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { NotificationType, OrderEventType, OrderStatus, PaymentRequirement, PaymentStatus, Prisma, ProductAvailability } from '@prisma/client';
import { CartService } from '../cart/cart.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import type { CheckoutDto } from './dto/checkout.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
    private readonly ordersService: OrdersService,
    private readonly notifications: NotificationsService = { enqueue: async () => undefined } as unknown as NotificationsService
  ) {}

  async checkout(userId: string, dto: CheckoutDto) {
    const cart = await this.cartService.ensureCart(userId);

    if (!cart.items.length) {
      throw new BadRequestException('Cart is empty.');
    }

    const now = new Date();
    for (const item of cart.items) {
      if (item.product.availability === ProductAvailability.PRE_ORDER) {
        if (item.product.preorderOpenAt && now < item.product.preorderOpenAt) {
          throw new ConflictException(`Pre-order has not opened for ${item.product.name}.`);
        }
        if (item.product.preorderCloseAt && now > item.product.preorderCloseAt) {
          throw new ConflictException(`Pre-order has closed for ${item.product.name}.`);
        }
      }
    }

    const orderId = await this.prisma.$transaction(async (tx) => {
      const subtotal = cart.items.reduce(
        (sum, item) => sum.plus(this.cartService.getItemUnitPrice(item).mul(item.quantity)),
        new Prisma.Decimal(0)
      );
      const shippingFee = this.getDefaultShippingFee();
      const total = subtotal.plus(shippingFee);
      const itemDeposits = cart.items.map((item) => {
        const lineTotal = this.cartService.getItemUnitPrice(item).mul(item.quantity);
        const percent = item.product.paymentRequirement === PaymentRequirement.DEPOSIT
          ? item.product.depositPercent
          : 100;

        return lineTotal.mul(percent).div(100).toDecimalPlaces(2);
      });
      const depositRequired = itemDeposits.reduce((sum, amount) => sum.plus(amount), shippingFee);

      for (const item of cart.items) {
        await this.commitInventory(tx, item);
      }

      const createdOrder = await tx.order.create({
        data: {
          orderNumber: this.createOrderNumber(),
          userId,
          status: OrderStatus.PENDING_CONFIRMATION,
          paymentStatus: PaymentStatus.UNPAID,
          subtotal,
          shippingFee,
          total,
          depositRequired,
          recipientName: dto.recipientName,
          recipientPhone: dto.recipientPhone,
          shippingAddress: dto.shippingAddress as Prisma.InputJsonValue,
          events: {
            create: {
              actorId: userId,
              type: OrderEventType.ORDER_CREATED
            }
          },
          items: {
            create: cart.items.map((item, index) => {
              const unitPrice = this.cartService.getItemUnitPrice(item);
              const inventoryCommitted = this.tracksInventory(item);

              return {
                productId: item.productId,
                productSnapshot: {
                  id: item.product.id,
                  name: item.product.name,
                  slug: item.product.slug,
                  studio: item.product.studio,
                  availability: item.product.availability
                  ,paymentRequirement: item.product.paymentRequirement
                  ,depositPercent: item.product.depositPercent
                } as Prisma.InputJsonValue,
                variantSnapshot: item.variant
                  ? ({
                      id: item.variant.id,
                      name: item.variant.name,
                      sku: item.variant.sku,
                      options: item.variant.options
                    } as Prisma.InputJsonValue)
                  : Prisma.JsonNull,
                quantity: item.quantity,
                unitPrice,
                totalPrice: unitPrice.mul(item.quantity)
                ,depositAmount: itemDeposits[index]
                ,inventoryCommitted
              };
            })
          }
        }
      });

      const user = await tx.user.findUnique({ where: { id: userId }, select: { email: true } });
      if (user) {
        await this.notifications.enqueue(tx, {
          userId,
          email: user.email,
          orderId: createdOrder.id,
          orderNumber: createdOrder.orderNumber,
          type: NotificationType.ORDER_CREATED,
          title: `Đã nhận đơn ${createdOrder.orderNumber}`,
          body: `Đơn hàng đã được tạo. Số tiền cần thanh toán trước: ${depositRequired.toString()} VND.`,
          dedupeKey: `order-created:${createdOrder.id}`
        });
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return createdOrder.id;
    });
    const order = await this.ordersService.findOrderOrThrow(orderId);

    return this.ordersService.serializeOrder(order);
  }

  private tracksInventory(item: Awaited<ReturnType<CartService['ensureCart']>>['items'][number]) {
    return item.variant?.trackInventory ?? item.product.trackInventory;
  }

  private getDefaultShippingFee() {
    const configuredFee = process.env.DEFAULT_SHIPPING_FEE?.trim() || '0';
    const shippingFee = new Prisma.Decimal(configuredFee);

    if (shippingFee.isNegative()) {
      throw new BadRequestException('Configured shipping fee cannot be negative.');
    }

    return shippingFee;
  }

  private async commitInventory(
    tx: Prisma.TransactionClient,
    item: Awaited<ReturnType<CartService['ensureCart']>>['items'][number]
  ) {
    if (!this.tracksInventory(item)) {
      return;
    }

    const result = item.variant
      ? await tx.productVariant.updateMany({
          where: { id: item.variant.id, isActive: true, inventoryQuantity: { gte: item.quantity } },
          data: { inventoryQuantity: { decrement: item.quantity } }
        })
      : await tx.product.updateMany({
          where: { id: item.product.id, status: 'ACTIVE', inventoryQuantity: { gte: item.quantity } },
          data: { inventoryQuantity: { decrement: item.quantity } }
        });

    if (result.count !== 1) {
      throw new ConflictException(`Insufficient inventory for ${item.product.name}.`);
    }
  }

  private createOrderNumber() {
    const date = new Date();
    const stamp = date.toISOString().slice(0, 10).replaceAll('-', '');
    const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();

    return `HBO-${stamp}-${suffix}`;
  }
}
