import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { NotFoundException } from '@nestjs/common';
import { ProductStatus, Prisma } from '@prisma/client';
import { CartService } from './cart.service';

/**
 * Cart Service Test Suite
 * 
 * Tests comprehensive cart operations:
 * - Cart initialization (auto-create on first access)
 * - Add item (new item vs quantity increment for existing)
 * - Update item quantity
 * - Remove item
 * - Product validation (active products only)
 * - Variant validation (belongs to product, is active)
 * - Cart ownership validation (user can only modify own cart)
 * - Price calculation (unit price from variant or product base price)
 * - Subtotal calculation
 */

describe('CartService', () => {
    let service: CartService;
    let prisma: any;

    beforeEach(() => {
        prisma = createMockPrisma();
        service = new CartService(prisma);
    });

    // ============================================================================
    // CART INITIALIZATION
    // ============================================================================

    it('getCart creates cart if not exists (upsert)', async () => {
        let cartCreated = false;
        prisma.cart.upsert = async (args: any) => {
            if (args.create) cartCreated = true;
            return {
                id: 'cart1',
                userId: 'user1',
                items: []
            };
        };

        await service.getCart('user1');

        assert.ok(cartCreated);
    });

    it('getCart returns existing cart with items', async () => {
        prisma.cart.upsert = async () => ({
            id: 'cart1',
            userId: 'user1',
            items: [
                mockCartItem('item1', 'prod1', null, 2, '100000')
            ]
        });

        const result = await service.getCart('user1');

        assert.equal(result.items.length, 1);
        assert.equal(result.items[0].quantity, 2);
    });

    // ============================================================================
    // ADD CART ITEM
    // ============================================================================

    it('addCartItem creates new item when product not in cart', async () => {
        let itemCreated = false;

        prisma.product.findUnique = async () => mockActiveProduct('prod1');
        prisma.cart.upsert = async () => ({ id: 'cart1', userId: 'user1', items: [] });
        prisma.cartItem.create = async (args: any) => {
            itemCreated = true;
            return { id: 'item1', ...args.data };
        };

        await service.addCartItem('user1', {
            productId: 'prod1',
            quantity: 2
        });

        assert.ok(itemCreated);
    });

    it('addCartItem increments quantity when product already in cart', async () => {
        let updatedQuantity = 0;
        const existingItem = mockCartItem('item1', 'prod1', null, 3, '100000');

        prisma.product.findUnique = async () => mockActiveProduct('prod1');
        prisma.cart.upsert = async () => ({
            id: 'cart1',
            userId: 'user1',
            items: [existingItem]
        });
        prisma.cartItem.update = async (args: any) => {
            updatedQuantity = args.data.quantity;
            return { ...existingItem, quantity: updatedQuantity };
        };

        await service.addCartItem('user1', {
            productId: 'prod1',
            quantity: 2
        });

        assert.equal(updatedQuantity, 5); // 3 + 2
    });

    it('addCartItem treats same product with different variants as separate items', async () => {
        const itemWithoutVariant = mockCartItem('item1', 'prod1', null, 1, '100000');
        const itemWithVariant = mockCartItem('item2', 'prod1', 'var1', 1, '120000');
        let newItemCreated = false;

        prisma.product.findUnique = async () => mockActiveProduct('prod1');
        prisma.productVariant.findFirst = async () => mockActiveVariant('var1', 'prod1');
        prisma.cart.upsert = async () => ({
            id: 'cart1',
            userId: 'user1',
            items: [itemWithoutVariant]
        });
        prisma.cartItem.create = async () => {
            newItemCreated = true;
            return itemWithVariant;
        };

        await service.addCartItem('user1', {
            productId: 'prod1',
            variantId: 'var1',
            quantity: 1
        });

        assert.ok(newItemCreated); // Should create new item, not increment existing
    });

    it('addCartItem rejects inactive product', async () => {
        prisma.product.findUnique = async () => null;

        await assert.rejects(
            () => service.addCartItem('user1', { productId: 'prod-inactive', quantity: 1 }),
            NotFoundException
        );
    });

    it('addCartItem rejects draft product', async () => {
        prisma.product.findUnique = async () => ({
            id: 'prod1',
            status: ProductStatus.DRAFT
        });

        await assert.rejects(
            () => service.addCartItem('user1', { productId: 'prod1', quantity: 1 }),
            NotFoundException
        );
    });

    it('addCartItem validates variant belongs to product', async () => {
        prisma.product.findUnique = async () => mockActiveProduct('prod1');
        prisma.productVariant.findFirst = async () => null; // variant not found

        await assert.rejects(
            () => service.addCartItem('user1', {
                productId: 'prod1',
                variantId: 'var-invalid',
                quantity: 1
            }),
            NotFoundException
        );
    });

    it('addCartItem rejects inactive variant', async () => {
        prisma.product.findUnique = async () => mockActiveProduct('prod1');
        prisma.productVariant.findFirst = async ({ where }: any) => {
            if (where.isActive === true) return null; // inactive variant filtered out
            return mockActiveVariant('var1', 'prod1');
        };

        await assert.rejects(
            () => service.addCartItem('user1', {
                productId: 'prod1',
                variantId: 'var1',
                quantity: 1
            }),
            NotFoundException
        );
    });

    // ============================================================================
    // UPDATE CART ITEM
    // ============================================================================

    it('updateCartItem updates quantity', async () => {
        let updatedQuantity = 0;
        const item = mockCartItem('item1', 'prod1', null, 2, '100000');

        prisma.cartItem.findFirst = async ({ where }: any) => {
            if (where.cart?.userId === 'user1') return item;
            return null;
        };
        prisma.cartItem.update = async (args: any) => {
            updatedQuantity = args.data.quantity;
            return { ...item, quantity: updatedQuantity };
        };
        prisma.cart.upsert = async () => ({
            id: 'cart1',
            userId: 'user1',
            items: [{ ...item, quantity: updatedQuantity }]
        });

        await service.updateCartItem('user1', 'item1', { quantity: 5 });

        assert.equal(updatedQuantity, 5);
    });

    it('updateCartItem rejects item from another user cart', async () => {
        prisma.cartItem.findFirst = async ({ where }: any) => {
            if (where.cart?.userId === 'user2') return null; // item belongs to user2
            return null;
        };

        await assert.rejects(
            () => service.updateCartItem('user1', 'item-other', { quantity: 3 }),
            NotFoundException
        );
    });

    it('updateCartItem rejects non-existent item', async () => {
        prisma.cartItem.findFirst = async () => null;

        await assert.rejects(
            () => service.updateCartItem('user1', 'item-nonexistent', { quantity: 3 }),
            NotFoundException
        );
    });

    // ============================================================================
    // REMOVE CART ITEM
    // ============================================================================

    it('removeCartItem deletes item', async () => {
        let itemDeleted = false;
        const item = mockCartItem('item1', 'prod1', null, 2, '100000');

        prisma.cartItem.findFirst = async ({ where }: any) => {
            if (where.cart?.userId === 'user1') return item;
            return null;
        };
        prisma.cartItem.delete = async () => {
            itemDeleted = true;
            return item;
        };
        prisma.cart.upsert = async () => ({
            id: 'cart1',
            userId: 'user1',
            items: []
        });

        await service.removeCartItem('user1', 'item1');

        assert.ok(itemDeleted);
    });

    it('removeCartItem rejects item from another user cart', async () => {
        prisma.cartItem.findFirst = async () => null;

        await assert.rejects(
            () => service.removeCartItem('user1', 'item-other'),
            NotFoundException
        );
    });

    it('removeCartItem rejects non-existent item', async () => {
        prisma.cartItem.findFirst = async () => null;

        await assert.rejects(
            () => service.removeCartItem('user1', 'item-nonexistent'),
            NotFoundException
        );
    });

    // ============================================================================
    // PRICE CALCULATION
    // ============================================================================

    it('getItemUnitPrice uses variant price when variant exists', () => {
        const item = mockCartItem('item1', 'prod1', 'var1', 1, '120000', '100000');

        const unitPrice = service.getItemUnitPrice(item as any);

        assert.equal(unitPrice.toString(), '120000');
    });

    it('getItemUnitPrice falls back to product base price when no variant', () => {
        const item = mockCartItem('item1', 'prod1', null, 1, '100000');

        const unitPrice = service.getItemUnitPrice(item as any);

        assert.equal(unitPrice.toString(), '100000');
    });

    it('getItemUnitPrice returns zero when product has no base price', () => {
        const item = mockCartItem('item1', 'prod1', null, 1, null);

        const unitPrice = service.getItemUnitPrice(item as any);

        assert.equal(unitPrice.toString(), '0');
    });

    it('cart subtotal sums all item totals correctly', async () => {
        prisma.cart.upsert = async () => ({
            id: 'cart1',
            userId: 'user1',
            items: [
                mockCartItem('item1', 'prod1', null, 2, '100000'),    // 200,000
                mockCartItem('item2', 'prod2', 'var1', 3, '150000'),  // 450,000
                mockCartItem('item3', 'prod3', null, 1, '50000')      // 50,000
            ]
        });

        const result = await service.getCart('user1');

        assert.equal(result.subtotal, '700000'); // 200k + 450k + 50k
    });

    it('cart subtotal is zero for empty cart', async () => {
        prisma.cart.upsert = async () => ({
            id: 'cart1',
            userId: 'user1',
            items: []
        });

        const result = await service.getCart('user1');

        assert.equal(result.subtotal, '0');
    });

    // ============================================================================
    // CART OWNERSHIP
    // ============================================================================

    it('user can only access their own cart', async () => {
        let requestedUserId: string | null = null;
        prisma.cart.upsert = async (args: any) => {
            requestedUserId = args.where.userId;
            return {
                id: 'cart1',
                userId: args.where.userId,
                items: []
            };
        };

        await service.getCart('user1');

        assert.equal(requestedUserId, 'user1');
    });

    it('user cannot update another user cart item', async () => {
        // Mock: return item only if it belongs to the requesting user
        prisma.cartItem.findFirst = async ({ where }: any) => {
            const itemId = where.id;
            const requestedUserId = where.cart?.userId;

            // item1 belongs to user1
            if (itemId === 'item1' && requestedUserId === 'user1') {
                return mockCartItem('item1', 'prod1', null, 1, '100000');
            }

            // item-belongs-to-user2 doesn't belong to user1
            if (itemId === 'item-belongs-to-user2' && requestedUserId === 'user1') {
                return null;
            }

            return null;
        };

        // User1 trying to update their own item - should work
        prisma.cartItem.update = async () => mockCartItem('item1', 'prod1', null, 5, '100000');
        prisma.cart.upsert = async () => ({ id: 'cart1', userId: 'user1', items: [] });

        const result = await service.updateCartItem('user1', 'item1', { quantity: 5 });
        assert.ok(result);

        // User1 trying to update user2's item - should fail
        await assert.rejects(
            () => service.updateCartItem('user1', 'item-belongs-to-user2', { quantity: 5 }),
            NotFoundException
        );
    });

    it('user cannot remove another user cart item', async () => {
        prisma.cartItem.findFirst = async ({ where }: any) => {
            if (where.cart?.userId !== 'user1') return null;
            return null; // item doesn't belong to user1
        };

        await assert.rejects(
            () => service.removeCartItem('user1', 'item-belongs-to-user2'),
            NotFoundException
        );
    });
});

// ============================================================================
// MOCK HELPERS
// ============================================================================

function createMockPrisma() {
    return {
        cart: {
            upsert: async () => ({ id: 'cart1', userId: 'user1', items: [] })
        },
        cartItem: {
            findFirst: async () => null,
            create: async () => ({} as any),
            update: async () => ({} as any),
            delete: async () => ({} as any)
        },
        product: {
            findUnique: async () => null
        },
        productVariant: {
            findFirst: async () => null
        }
    };
}

function mockActiveProduct(id: string) {
    return {
        id,
        name: `Product ${id}`,
        slug: `product-${id}`,
        status: ProductStatus.ACTIVE,
        basePrice: new Prisma.Decimal(100000),
        compareAtPrice: null,
        images: []
    };
}

function mockActiveVariant(id: string, productId: string) {
    return {
        id,
        productId,
        name: `Variant ${id}`,
        sku: null,
        options: null,
        price: new Prisma.Decimal(120000),
        isActive: true,
        trackInventory: false,
        inventoryQuantity: 0
    };
}

function mockCartItem(
    id: string,
    productId: string,
    variantId: string | null,
    quantity: number,
    priceStr: string | null,
    basePrice?: string
) {
    const price = priceStr ? new Prisma.Decimal(priceStr) : null;
    const basePriceDecimal = basePrice ? new Prisma.Decimal(basePrice) : price;

    return {
        id,
        cartId: 'cart1',
        productId,
        variantId,
        quantity,
        createdAt: new Date(),
        updatedAt: new Date(),
        product: {
            id: productId,
            name: `Product ${productId}`,
            slug: `product-${productId}`,
            status: ProductStatus.ACTIVE,
            basePrice: basePriceDecimal,
            compareAtPrice: null,
            images: [{ url: 'https://example.com/img.jpg', sortOrder: 0 }]
        },
        variant: variantId ? {
            id: variantId,
            productId,
            name: `Variant ${variantId}`,
            sku: null,
            options: null,
            price,
            isActive: true,
            trackInventory: false,
            inventoryQuantity: 0
        } : null
    };
}
