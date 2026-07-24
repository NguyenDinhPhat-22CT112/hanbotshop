import { BadRequestException, ConflictException } from '@nestjs/common';
import { OrderStatus, PaymentRequirement, PaymentStatus, Prisma, ProductAvailability } from '@prisma/client';
import assert from 'node:assert/strict';
import test from 'node:test';
import { CheckoutService } from './checkout.service';

process.env.DEFAULT_SHIPPING_FEE = '30';

function cartItem() {
  return {
    id: 'item-1', cartId: 'cart-1', productId: 'product-1', variantId: 'variant-1', quantity: 2,
    createdAt: new Date(), updatedAt: new Date(),
    product: {
      id: 'product-1', name: 'Figure A', slug: 'figure-a', studio: 'Studio',
      availability: ProductAvailability.IN_STOCK, basePrice: new Prisma.Decimal(100), images: [],
      paymentRequirement: 'FULL', depositPercent: 100, trackInventory: false, inventoryQuantity: 10
    },
    variant: { id: 'variant-1', name: 'Large', sku: 'SKU-L', options: { size: 'L' }, price: new Prisma.Decimal(150), trackInventory: false, inventoryQuantity: 10 }
  };
}

const checkoutDto = {
  recipientName: 'Nguyen Van A', recipientPhone: '0900000000',
  shippingAddress: { line1: '1 Le Loi', city: 'HCM', countryCode: 'VN' }
};

test('checkout rejects an empty cart without opening a transaction', async () => {
  let transactionCalled = false;
  const prisma = { $transaction: async () => { transactionCalled = true; } };
  const cartService = { ensureCart: async () => ({ id: 'cart-1', items: [] }) };
  const service = new CheckoutService(prisma as never, cartService as never, {} as never, {} as never);

  await assert.rejects(() => service.checkout('user-1', checkoutDto), BadRequestException);
  assert.equal(transactionCalled, false);
});

test('checkout snapshots product and variant prices and clears cart in one transaction', async () => {
  const item = cartItem();
  let createData: Record<string, unknown> | undefined;
  let deletedCartId = '';
  const tx = {
    order: { create: async ({ data }: { data: Record<string, unknown> }) => { createData = data; return { id: 'order-1' }; } },
    cartItem: { deleteMany: async ({ where }: { where: { cartId: string } }) => { deletedCartId = where.cartId; return { count: 1 }; } }
  };
  const prisma = { $transaction: async (handler: (client: typeof tx) => unknown) => handler(tx) };
  const cartService = {
    ensureCart: async () => ({ id: 'cart-1', items: [item] }),
    getItemUnitPrice: () => new Prisma.Decimal(150)
  };
  const ordersService = {
    findOrderOrThrow: async () => ({ id: 'order-1' }),
    serializeOrder: (order: { id: string }) => order
  };
  const notifications = { enqueue: async () => undefined };
  (tx as typeof tx & { user: unknown }).user = { findUnique: async () => ({ email: 'customer@example.com' }) };
  const service = new CheckoutService(prisma as never, cartService as never, ordersService as never, notifications as never);

  const result = await service.checkout('user-1', checkoutDto);
  const data = createData as {
    status: OrderStatus; paymentStatus: PaymentStatus; subtotal: Prisma.Decimal; total: Prisma.Decimal;
    items: { create: Array<{ productSnapshot: { name: string }; variantSnapshot: { sku: string }; unitPrice: Prisma.Decimal; totalPrice: Prisma.Decimal }> };
  };

  assert.equal(result.id, 'order-1');
  assert.equal(data.status, OrderStatus.PENDING_CONFIRMATION);
  assert.equal(data.paymentStatus, PaymentStatus.UNPAID);
  assert.equal(data.subtotal.toString(), '300');
  assert.equal(data.total.toString(), '330');
  assert.equal(data.items.create[0].productSnapshot.name, 'Figure A');
  assert.equal(data.items.create[0].variantSnapshot.sku, 'SKU-L');
  assert.equal(data.items.create[0].unitPrice.toString(), '150');
  assert.equal(data.items.create[0].totalPrice.toString(), '300');
  assert.equal(deletedCartId, 'cart-1');
});

test('checkout does not clear cart when order creation fails', async () => {
  let deleteCalled = false;
  const tx = {
    order: { create: async () => { throw new Error('database failure'); } },
    cartItem: { deleteMany: async () => { deleteCalled = true; } }
  };
  const prisma = { $transaction: async (handler: (client: typeof tx) => unknown) => handler(tx) };
  const cartService = {
    ensureCart: async () => ({ id: 'cart-1', items: [cartItem()] }),
    getItemUnitPrice: () => new Prisma.Decimal(150)
  };
  const service = new CheckoutService(prisma as never, cartService as never, {} as never, {} as never);

  await assert.rejects(() => service.checkout('user-1', checkoutDto), /database failure/);
  assert.equal(deleteCalled, false);
});

test('pre-order checkout calculates deposit and atomically commits variant inventory', async () => {
  const item = cartItem();
  (item.product as { availability: ProductAvailability }).availability = ProductAvailability.PRE_ORDER;
  item.product.paymentRequirement = PaymentRequirement.DEPOSIT;
  item.product.depositPercent = 40;
  item.variant.trackInventory = true;
  let orderData: { depositRequired: Prisma.Decimal; items: { create: Array<{ depositAmount: Prisma.Decimal; inventoryCommitted: boolean }> } } | undefined;
  let inventoryDecrement = 0;
  const tx = {
    productVariant: {
      updateMany: async ({ data }: { data: { inventoryQuantity: { decrement: number } } }) => {
        inventoryDecrement = data.inventoryQuantity.decrement;
        return { count: 1 };
      }
    },
    product: { updateMany: async () => ({ count: 1 }) },
    order: { create: async ({ data }: { data: typeof orderData }) => { orderData = data; return { id: 'order-1', orderNumber: 'HBO-1' }; } },
    user: { findUnique: async () => null },
    cartItem: { deleteMany: async () => ({ count: 1 }) }
  };
  const prisma = { $transaction: async (handler: (client: typeof tx) => unknown) => handler(tx) };
  const cartService = { ensureCart: async () => ({ id: 'cart-1', items: [item] }), getItemUnitPrice: () => new Prisma.Decimal(150) };
  const orders = { findOrderOrThrow: async () => ({ id: 'order-1' }), serializeOrder: (value: unknown) => value };
  const service = new CheckoutService(prisma as never, cartService as never, orders as never);

  await service.checkout('user-1', checkoutDto);

  assert.equal(orderData?.depositRequired.toString(), '150');
  assert.equal(orderData?.items.create[0].depositAmount.toString(), '120');
  assert.equal(orderData?.items.create[0].inventoryCommitted, true);
  assert.equal(inventoryDecrement, 2);
});

test('checkout rejects insufficient tracked inventory', async () => {
  const item = cartItem();
  item.variant.trackInventory = true;
  const tx = {
    productVariant: { updateMany: async () => ({ count: 0 }) },
    product: { updateMany: async () => ({ count: 0 }) }
  };
  const prisma = { $transaction: async (handler: (client: typeof tx) => unknown) => handler(tx) };
  const cartService = { ensureCart: async () => ({ id: 'cart-1', items: [item] }), getItemUnitPrice: () => new Prisma.Decimal(150) };
  const service = new CheckoutService(prisma as never, cartService as never, {} as never);

  await assert.rejects(() => service.checkout('user-1', checkoutDto), ConflictException);
});
