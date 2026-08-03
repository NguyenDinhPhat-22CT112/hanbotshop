'use client';

import { useState } from 'react';
import { addCartItem, ApiError } from '../lib/browser-api';
import { addGuestCartItem } from '../lib/guest-cart';

type AddToCartButtonProps = {
  productId: string;
  productName: string;
  productImageUrl?: string | null;
  unitPrice: string;
  paymentRequirement: 'FULL' | 'DEPOSIT';
  depositPercent: number;
  variantId?: string | null;
  variantName?: string | null;
  label?: string;
  onSuccess?: () => void;
  beforeAdd?: () => boolean;
  disabled?: boolean;
  quantity?: number;
};

export function AddToCartButton({
  productId,
  productName,
  productImageUrl,
  unitPrice,
  paymentRequirement,
  depositPercent,
  variantId = null,
  variantName = null,
  label = 'Chọn mua',
  onSuccess,
  beforeAdd,
  disabled = false,
  quantity = 1
}: AddToCartButtonProps) {
  const [message, setMessage] = useState('');

  async function add() {
    if (disabled) return;
    if (beforeAdd && !beforeAdd()) return;
    setMessage('Đang thêm vào giỏ...');

    try {
      const result = await addCartItem(productId, variantId, quantity, paymentRequirement);
      setMessage(result.itemAdded ? 'Đã thêm vào giỏ hàng.' : '');
      onSuccess?.();
      window.dispatchEvent(new CustomEvent('cart-updated'));
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        const result = addGuestCartItem({
          productId,
          variantId,
          quantity,
          unitPrice,
          product: {
            name: productName,
            imageUrl: productImageUrl,
            paymentRequirement,
            depositPercent
          },
          variant: variantName ? { name: variantName } : null
        });

        setMessage(result.full ? 'Giỏ hàng tạm đã đạt giới hạn 30 sản phẩm.' : result.added ? 'Đã thêm vào giỏ hàng.' : '');
        onSuccess?.();
        return;
      }

      setMessage(error instanceof Error ? error.message : 'Vui lòng đăng nhập trước.');
    }
  }

  return (
    <div className="action-stack">
      <button type="button" onClick={add} disabled={disabled} aria-disabled={disabled}>{label}</button>
      {message ? <span role="status" aria-live="polite">{message}</span> : null}
    </div>
  );
}
