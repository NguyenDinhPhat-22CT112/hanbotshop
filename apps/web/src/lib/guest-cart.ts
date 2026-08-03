'use client';

import { mergeCartItems, type CartResponse } from './browser-api';

const STORAGE_KEY = 'hanbotorder_guest_cart_v1';
const CART_LIFETIME_MS = 24 * 60 * 60 * 1000;
const MAX_GUEST_CART_ITEMS = 30;

type StoredGuestCart = {
  expiresAt: number;
  items: GuestCartItem[];
};

type GuestCartItem = CartResponse['items'][number];

export type GuestCartItemInput = {
  productId: string;
  variantId?: string | null;
  quantity?: number;
  unitPrice: string;
  paymentRequirement: 'FULL' | 'DEPOSIT';
  product: {
    name: string;
    imageUrl?: string | null;
    paymentRequirement: 'FULL' | 'DEPOSIT';
    depositPercent: number;
  };
  variant?: { name: string } | null;
};

export function getGuestCart(): CartResponse {
  const storedCart = readStoredCart();

  return toCartResponse(storedCart?.items ?? []);
}

export function addGuestCartItem(input: GuestCartItemInput) {
  const storedCart = readStoredCart();
  const items = storedCart?.items ?? [];
  const variantId = input.variantId ?? null;
  const paymentRequirement = input.paymentRequirement ?? 'FULL';
  const id = guestItemId(input.productId, variantId, paymentRequirement);
  const existingItem = items.find((item) => item.id === id);

  if (existingItem) {
    writeStoredCart(items, storedCart?.expiresAt);
    return { cart: toCartResponse(items), added: false, full: false };
  }

  if (items.length >= MAX_GUEST_CART_ITEMS) {
    return { cart: toCartResponse(items), added: false, full: true };
  }

  const quantity = Math.min(99, Math.max(1, Math.trunc(input.quantity ?? 1)));
  const unitPrice = normalizePrice(input.unitPrice);
  const item: GuestCartItem = {
    id,
    productId: input.productId,
    variantId,
    quantity,
    unitPrice,
    totalPrice: multiplyPrice(unitPrice, quantity),
    paymentRequirement,
    product: input.product,
    variant: input.variant ?? null
  };
  const nextItems = [...items, item];

  writeStoredCart(nextItems, storedCart?.expiresAt);

  return { cart: toCartResponse(nextItems), added: true, full: false };
}

export function updateGuestCartItem(itemId: string, quantity: number) {
  const storedCart = readStoredCart();
  const items = storedCart?.items ?? [];
  const nextQuantity = Math.min(99, Math.max(1, Math.trunc(quantity)));
  const nextItems = items.map((item) =>
    item.id === itemId
      ? {
        ...item,
        quantity: nextQuantity,
        totalPrice: multiplyPrice(item.unitPrice, nextQuantity)
      }
      : item
  );

  writeStoredCart(nextItems, storedCart?.expiresAt);

  return toCartResponse(nextItems);
}

export function removeGuestCartItem(itemId: string) {
  const storedCart = readStoredCart();
  const items = storedCart?.items ?? [];
  const nextItems = items.filter((item) => item.id !== itemId);

  writeStoredCart(nextItems, storedCart?.expiresAt);

  return toCartResponse(nextItems);
}

export function clearGuestCart(notify = true) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
  if (notify) {
    dispatchCartUpdated();
  }
}

export async function mergeGuestCartAfterAuthentication() {
  const guestCart = getGuestCart();

  if (!guestCart.items.length) {
    return null;
  }

  const mergedCart = await mergeCartItems(
    guestCart.items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      paymentRequirement: item.paymentRequirement
    }))
  );

  clearGuestCart();

  return mergedCart;
}

export function isGuestCartStorageEvent(event: StorageEvent) {
  return event.key === STORAGE_KEY;
}

function readStoredCart(): StoredGuestCart | null {
  if (!canUseStorage()) {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);

    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as Partial<StoredGuestCart>;

    if (
      typeof parsed.expiresAt !== 'number' ||
      parsed.expiresAt <= Date.now() ||
      !Array.isArray(parsed.items)
    ) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return {
      expiresAt: parsed.expiresAt,
      items: parsed.items.filter(isGuestCartItem).slice(0, MAX_GUEST_CART_ITEMS)
    };
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function writeStoredCart(items: GuestCartItem[], currentExpiresAt?: number) {
  if (!canUseStorage()) {
    return;
  }

  if (!items.length) {
    window.localStorage.removeItem(STORAGE_KEY);
  } else {
    const payload: StoredGuestCart = {
      expiresAt: currentExpiresAt ?? Date.now() + CART_LIFETIME_MS,
      items
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }

  dispatchCartUpdated();
}

function toCartResponse(items: GuestCartItem[]): CartResponse {
  return {
    items,
    subtotal: items.reduce((total, item) => total + Number(item.totalPrice || 0), 0).toString()
  };
}

function isGuestCartItem(value: unknown): value is GuestCartItem {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const item = value as Partial<GuestCartItem>;

  return (
    typeof item.id === 'string' &&
    typeof item.productId === 'string' &&
    (item.variantId === null || typeof item.variantId === 'string') &&
    typeof item.quantity === 'number' &&
    item.quantity >= 1 &&
    item.quantity <= 99 &&
    typeof item.unitPrice === 'string' &&
    (item.paymentRequirement === 'FULL' || item.paymentRequirement === 'DEPOSIT') &&
    typeof item.product?.name === 'string'
  );
}

function normalizePrice(value: string) {
  const trimmedValue = value.trim();

  if (/^\d+(?:\.\d+)?$/.test(trimmedValue)) {
    return Number(trimmedValue).toString();
  }

  const digits = trimmedValue.replace(/[^\d]/g, '');

  return digits || '0';
}

function multiplyPrice(unitPrice: string, quantity: number) {
  return (Number(unitPrice || 0) * quantity).toString();
}

function guestItemId(productId: string, variantId: string | null, paymentRequirement: 'FULL' | 'DEPOSIT' = 'FULL') {
  return `guest:${productId}:${variantId ?? 'base'}:${paymentRequirement}`;
}

function dispatchCartUpdated() {
  window.dispatchEvent(new CustomEvent('cart-updated'));
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}
