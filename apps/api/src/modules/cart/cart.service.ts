import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProductAvailability, ProductStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AddCartItemDto, MergeGuestCartDto, UpdateCartItemDto } from './dto/cart.dto';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) { }

  async getCart(userId: string) {
    const cart = await this.ensureCart(userId);

    return this.serializeCart(cart);
  }

  async addCartItem(userId: string, dto: AddCartItemDto) {
    await this.ensureProductCanBePurchased(dto.productId, dto.quantity);

    if (dto.variantId) {
      await this.ensureVariantBelongsToProduct(dto.productId, dto.variantId, dto.quantity);
    }

    const cart = await this.ensureCart(userId);

    // Check if same product+variant combination exists with same payment requirement
    const existingItem = cart.items.find(
      (item) =>
        item.productId === dto.productId &&
        (item.variantId ?? null) === (dto.variantId ?? null) &&
        item.paymentRequirement === (dto.paymentRequirement ?? 'FULL')
    );

    if (existingItem) {
      return {
        ...(await this.getCart(userId)),
        itemAdded: false
      };
    }

    await this.prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: dto.productId,
        variantId: dto.variantId ?? null,
        quantity: dto.quantity,
        paymentRequirement: dto.paymentRequirement ?? 'FULL'
      }
    });

    return {
      ...(await this.getCart(userId)),
      itemAdded: true
    };
  }

  async mergeGuestCart(userId: string, dto: MergeGuestCartDto) {
    const cart = await this.ensureCart(userId);
    const existingKeys = new Set(
      cart.items.map((item) => this.cartItemKey(item.productId, item.variantId, item.paymentRequirement))
    );
    let mergedCount = 0;

    for (const item of dto.items) {
      const key = this.cartItemKey(item.productId, item.variantId, item.paymentRequirement);

      if (existingKeys.has(key)) {
        continue;
      }

      try {
        await this.ensureProductCanBePurchased(item.productId, item.quantity);

        if (item.variantId) {
          await this.ensureVariantBelongsToProduct(item.productId, item.variantId, item.quantity);
        }
      } catch (error) {
        if (error instanceof NotFoundException || error instanceof ConflictException) {
          continue;
        }

        throw error;
      }

      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: item.productId,
          variantId: item.variantId ?? null,
          quantity: item.quantity,
          paymentRequirement: item.paymentRequirement ?? 'FULL'
        }
      });
      existingKeys.add(key);
      mergedCount += 1;
    }

    return {
      ...(await this.getCart(userId)),
      mergedCount,
      skippedCount: dto.items.length - mergedCount
    };
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
          images: { orderBy: { sortOrder: 'asc' as const }, take: 1 },
          category: true,
          tags: {
            include: {
              tag: true
            }
          }
        }
      },
      variant: true
    };
  }

  private async ensureProductCanBePurchased(productId: string, quantity: number) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });

    if (!product || product.status !== ProductStatus.ACTIVE) {
      throw new NotFoundException('Product not found.');
    }

    if (product.availability === ProductAvailability.CONTACT) {
      throw new ConflictException('Product is not available for cart checkout.');
    }

    if (product.availability === ProductAvailability.PRE_ORDER) {
      const now = new Date();

      if (product.preorderOpenAt && now < product.preorderOpenAt) {
        throw new ConflictException('Product pre-order has not opened.');
      }

      if (product.preorderCloseAt && now > product.preorderCloseAt) {
        throw new ConflictException('Product pre-order has closed.');
      }
    }

    if (product.trackInventory && product.inventoryQuantity < quantity) {
      throw new ConflictException('Insufficient product inventory.');
    }

    return product;
  }

  private async ensureVariantBelongsToProduct(productId: string, variantId: string, quantity: number) {
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

    if (variant.trackInventory && variant.inventoryQuantity < quantity) {
      throw new ConflictException('Insufficient product variant inventory.');
    }

    return variant;
  }

  private cartItemKey(productId: string, variantId?: string | null, paymentRequirement?: 'FULL' | 'DEPOSIT' | null) {
    return `${productId}:${variantId ?? 'base'}:${paymentRequirement ?? 'FULL'}`;
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
        paymentRequirement: item.paymentRequirement,
        product: {
          ...item.product,
          basePrice: item.product.basePrice?.toString() ?? null,
          compareAtPrice: item.product.compareAtPrice?.toString() ?? null,
          imageUrl: firstImage?.url ?? null,
          paymentRequirement: item.product.paymentRequirement,
          depositPercent: item.product.depositPercent,
          orderType:
            item.product.category?.placement === 'RESIN'
              || item.product.tags?.some((entry) => entry.tag.slug.toLowerCase() === 'resin')
              || item.product.slug.toLowerCase().includes('resin')
              ? 'RESIN'
              : 'ORDER'
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
