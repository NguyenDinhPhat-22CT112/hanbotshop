import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProductStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AddCartItemDto, UpdateCartItemDto } from './dto/cart.dto';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getCart(userId: string) {
    const cart = await this.ensureCart(userId);

    return this.serializeCart(cart);
  }

  async addCartItem(userId: string, dto: AddCartItemDto) {
    await this.ensureProductCanBePurchased(dto.productId);

    if (dto.variantId) {
      await this.ensureVariantBelongsToProduct(dto.productId, dto.variantId);
    }

    const cart = await this.ensureCart(userId);
    const existingItem = cart.items.find(
      (item) => item.productId === dto.productId && (item.variantId ?? null) === (dto.variantId ?? null)
    );

    if (existingItem) {
      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + dto.quantity }
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: dto.productId,
          variantId: dto.variantId ?? null,
          quantity: dto.quantity
        }
      });
    }

    return this.getCart(userId);
  }

  async updateCartItem(userId: string, itemId: string, dto: UpdateCartItemDto) {
    await this.ensureCartItemOwner(userId, itemId);

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: dto.quantity }
    });

    return this.getCart(userId);
  }

  async removeCartItem(userId: string, itemId: string) {
    await this.ensureCartItemOwner(userId, itemId);
    await this.prisma.cartItem.delete({ where: { id: itemId } });

    return this.getCart(userId);
  }

  async ensureCart(userId: string) {
    const cart = await this.prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
      include: this.cartInclude()
    });

    return cart;
  }

  getItemUnitPrice(item: Prisma.CartItemGetPayload<{ include: ReturnType<CartService['cartItemInclude']> }>) {
    return item.variant?.price ?? item.product.basePrice ?? new Prisma.Decimal(0);
  }

  cartItemInclude() {
    return {
      product: {
        include: {
          images: { orderBy: { sortOrder: 'asc' as const }, take: 1 }
        }
      },
      variant: true
    };
  }

  private async ensureProductCanBePurchased(productId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });

    if (!product || product.status !== ProductStatus.ACTIVE) {
      throw new NotFoundException('Product not found.');
    }

    return product;
  }

  private async ensureVariantBelongsToProduct(productId: string, variantId: string) {
    const variant = await this.prisma.productVariant.findFirst({
      where: {
        id: variantId,
        productId,
        isActive: true
      }
    });

    if (!variant) {
      throw new NotFoundException('Product variant not found.');
    }

    return variant;
  }

  private async ensureCartItemOwner(userId: string, itemId: string) {
    const item = await this.prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cart: { userId }
      }
    });

    if (!item) {
      throw new NotFoundException('Cart item not found.');
    }

    return item;
  }

  private cartInclude() {
    return {
      items: {
        orderBy: { createdAt: 'asc' as const },
        include: this.cartItemInclude()
      }
    };
  }

  private serializeCart(cart: Prisma.CartGetPayload<{ include: ReturnType<CartService['cartInclude']> }>) {
    const items = cart.items.map((item) => {
      const unitPrice = this.getItemUnitPrice(item);
      const firstImage = item.product.images[0];

      return {
        ...item,
        unitPrice: unitPrice.toString(),
        totalPrice: unitPrice.mul(item.quantity).toString(),
        product: {
          ...item.product,
          basePrice: item.product.basePrice?.toString() ?? null,
          compareAtPrice: item.product.compareAtPrice?.toString() ?? null,
          imageUrl: firstImage?.url ?? null
        },
        variant: item.variant ? { ...item.variant, price: item.variant.price?.toString() ?? null } : null
      };
    });
    const subtotal = items.reduce((sum, item) => sum.plus(item.totalPrice), new Prisma.Decimal(0));

    return {
      ...cart,
      items,
      subtotal: subtotal.toString()
    };
  }
}
