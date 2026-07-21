'use client';

import { useState } from 'react';
import { addCartItem } from '../lib/browser-api';

type AddToCartButtonProps = {
  productId: string;
  variantId?: string | null;
  label?: string;
  onSuccess?: () => void;
  beforeAdd?: () => boolean;
  disabled?: boolean;
  quantity?: number;
};

export function AddToCartButton({ productId, variantId = null, label = 'Chọn mua', onSuccess, beforeAdd, disabled = false, quantity = 1 }: AddToCartButtonProps) {
  const [message, setMessage] = useState('');

  async function add() {
    if (disabled) return;
    if (beforeAdd && !beforeAdd()) return;
    setMessage('Đang thêm vào giỏ...');

    try {
      await addCartItem(productId, variantId, quantity);
      setMessage('Đã thêm vào giỏ hàng.');
      onSuccess?.();
      window.dispatchEvent(new CustomEvent('cart-updated'));
    } catch (error) {
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
