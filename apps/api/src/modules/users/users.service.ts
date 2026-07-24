import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { AuditService } from '../../common/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import type {
  AddressDto,
  CreateUserDto,
  UpdateAddressDto,
  UpdateProfileDto,
  UpdateUserRoleDto,
  UpdateUserStatusDto,
  UserListQueryDto
} from './dto/users.dto';
import { PasswordService } from '../identity/services/password.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly passwordService: PasswordService = new PasswordService()
  ) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: this.userSelect()
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return user;
  }

  async updateMe(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: dto.name === undefined ? undefined : dto.name,
        phone: dto.phone === undefined ? undefined : dto.phone
      },
      select: this.userSelect()
    });

    return user;
  }

  async listUsers(query: UserListQueryDto) {
    const where: Prisma.UserWhereInput = {
      role: query.role,
      status: query.status,
      OR: query.q
        ? [
            { email: { contains: query.q, mode: 'insensitive' } },
            { name: { contains: query.q, mode: 'insensitive' } },
            { phone: { contains: query.q, mode: 'insensitive' } }
          ]
        : undefined
    };
    const skip = (query.page - 1) * query.pageSize;
    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take: query.pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          ...this.userSelect(),
          _count: {
            select: {
              orders: true
            }
          }
        }
      }),
      this.prisma.user.count({ where })
    ]);

    return {
      data: users,
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        pageCount: Math.ceil(total / query.pageSize)
      }
    };
  }

  async getUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        ...this.userSelect(),
        addresses: true,
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            orderNumber: true,
            status: true,
            paymentStatus: true,
            total: true,
            createdAt: true
          }
        },
      }
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return {
      ...user,
      orders: user.orders.map((order) => ({
        ...order,
        total: order.total.toString()
      }))
    };
  }

  async createUser(actorId: string, dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email }, select: { id: true } });
    if (existing) throw new ConflictException('Email này đã được sử dụng.');
    const passwordHash = await this.passwordService.hashPassword(dto.password);
    const user = await this.prisma.user.create({
      data: { email: dto.email, passwordHash, name: dto.name ?? null, phone: dto.phone ?? null, role: dto.role, status: dto.status },
      select: this.userSelect()
    });
    await this.auditService.record({ actorId, action: AuditAction.CREATE, resourceType: 'User', resourceId: user.id, after: { email: user.email, role: user.role, status: user.status } });
    return user;
  }

  async deleteUser(actorId: string, id: string) {
    this.assertNotSelf(actorId, id, 'account');
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true, email: true, role: true, status: true, _count: { select: { orders: true } } } });
    if (!user) throw new NotFoundException('User not found.');
    if (user._count.orders > 0) throw new ConflictException('Không thể xóa người dùng đã có đơn hàng. Hãy khóa tài khoản để bảo toàn lịch sử giao dịch.');
    await this.prisma.$transaction(async (tx) => {
      await tx.cartItem.deleteMany({ where: { cart: { userId: id } } });
      await tx.cart.deleteMany({ where: { userId: id } });
      await tx.address.deleteMany({ where: { userId: id } });
      await tx.file.updateMany({ where: { ownerId: id }, data: { ownerId: null } });
      await tx.emailOutbox.updateMany({ where: { userId: id }, data: { userId: null } });
      await tx.user.delete({ where: { id } });
    });
    await this.auditService.record({ actorId, action: AuditAction.DELETE, resourceType: 'User', resourceId: id, before: { email: user.email, role: user.role, status: user.status } });
    return { success: true };
  }

  async updateStatus(actorId: string, id: string, dto: UpdateUserStatusDto) {
    this.assertNotSelf(actorId, id, 'status');
    const before = await this.findUserForAudit(id);

    const user = await this.prisma.user.update({
      where: { id },
      data: { status: dto.status },
      select: this.userSelect()
    });

    await this.auditService.record({
      actorId,
      action: AuditAction.USER_STATUS_CHANGE,
      resourceType: 'User',
      resourceId: id,
      before: { status: before.status },
      after: { status: dto.status }
    });

    return user;
  }

  async updateRole(actorId: string, id: string, dto: UpdateUserRoleDto) {
    this.assertNotSelf(actorId, id, 'role');
    const before = await this.findUserForAudit(id);

    const user = await this.prisma.user.update({
      where: { id },
      data: { role: dto.role },
      select: this.userSelect()
    });

    await this.auditService.record({
      actorId,
      action: AuditAction.ROLE_CHANGE,
      resourceType: 'User',
      resourceId: id,
      before: { role: before.role },
      after: { role: dto.role }
    });

    return user;
  }

  async getUserOrders(id: string) {
    await this.ensureUserExists(id);
    const orders = await this.prisma.order.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        items: true
      }
    });

    return {
      data: orders.map((order) => ({
        ...order,
        subtotal: order.subtotal.toString(),
        shippingFee: order.shippingFee.toString(),
        total: order.total.toString(),
        items: order.items.map((item) => ({
          ...item,
          unitPrice: item.unitPrice.toString(),
          totalPrice: item.totalPrice.toString()
        }))
      }))
    };
  }

  async listAddresses(userId: string) {
    const addresses = await this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }]
    });

    return { data: addresses };
  }

  async createAddress(userId: string, dto: AddressDto) {
    const address = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.address.updateMany({
          where: { userId },
          data: { isDefault: false }
        });
      }

      return tx.address.create({
        data: {
          userId,
          recipient: dto.recipient,
          phone: dto.phone,
          line1: dto.line1,
          line2: dto.line2 ?? null,
          city: dto.city,
          province: dto.province ?? null,
          postalCode: dto.postalCode ?? null,
          countryCode: dto.countryCode,
          isDefault: dto.isDefault
        }
      });
    });

    return address;
  }

  async updateAddress(userId: string, id: string, dto: UpdateAddressDto) {
    await this.ensureAddressOwner(userId, id);
    const address = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.address.updateMany({
          where: { userId, id: { not: id } },
          data: { isDefault: false }
        });
      }

      return tx.address.update({
        where: { id },
        data: {
          recipient: dto.recipient,
          phone: dto.phone,
          line1: dto.line1,
          line2: dto.line2 === undefined ? undefined : dto.line2,
          city: dto.city,
          province: dto.province === undefined ? undefined : dto.province,
          postalCode: dto.postalCode === undefined ? undefined : dto.postalCode,
          countryCode: dto.countryCode,
          isDefault: dto.isDefault
        }
      });
    });

    return address;
  }

  async deleteAddress(userId: string, id: string) {
    await this.ensureAddressOwner(userId, id);
    await this.prisma.address.delete({ where: { id } });

    return { success: true };
  }

  async setDefaultAddress(userId: string, id: string) {
    await this.ensureAddressOwner(userId, id);

    const address = await this.prisma.$transaction(async (tx) => {
      await tx.address.updateMany({
        where: { userId, id: { not: id } },
        data: { isDefault: false }
      });

      return tx.address.update({
        where: { id },
        data: { isDefault: true }
      });
    });

    return address;
  }

  private async ensureUserExists(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found.');
    }
  }

  private async ensureAddressOwner(userId: string, id: string) {
    const address = await this.prisma.address.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!address) {
      throw new NotFoundException('Address not found.');
    }

    return address;
  }

  private assertNotSelf(actorId: string, id: string, action: string) {
    if (actorId === id) {
      throw new ForbiddenException(`Admins cannot change their own ${action}.`);
    }
  }

  private async findUserForAudit(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        role: true,
        status: true
      }
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return user;
  }

  private userSelect() {
    return {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true
    } as const;
  }
}
