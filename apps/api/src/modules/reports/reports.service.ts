import { Injectable } from '@nestjs/common';
import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async revenue() {
    const paidWhere: Prisma.OrderWhereInput = {
      paymentStatus: {
        in: [PaymentStatus.PAID, PaymentStatus.PARTIALLY_PAID]
      },
      status: {
        notIn: [OrderStatus.CANCELLED]
      }
    };
    const [paidOrders, allOrders, pendingOrders, recentOrders] = await this.prisma.$transaction([
      this.prisma.order.aggregate({
        where: paidWhere,
        _sum: { total: true },
        _count: { _all: true }
      }),
      this.prisma.order.count(),
      this.prisma.order.count({
        where: {
          paymentStatus: {
            in: [PaymentStatus.UNPAID, PaymentStatus.PARTIALLY_PAID]
          },
          status: {
            notIn: [OrderStatus.CANCELLED, OrderStatus.COMPLETED]
          }
        }
      }),
      this.prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          paymentStatus: true,
          total: true,
          createdAt: true,
          user: {
            select: {
              email: true,
              name: true
            }
          }
        }
      })
    ]);

    return {
      revenue: paidOrders._sum.total?.toString() ?? '0',
      paidOrderCount: paidOrders._count._all,
      orderCount: allOrders,
      pendingPaymentCount: pendingOrders,
      recentOrders: recentOrders.map((order) => ({
        ...order,
        total: order.total.toString()
      }))
    };
  }
}
