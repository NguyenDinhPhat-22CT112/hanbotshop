'use client';

import { useState } from 'react';
import { ProductVariantSelector } from './product-variant-selector';
import { AddToCartButton } from './add-to-cart-button';

type ProductVariant = { id: string; name: string; price: string | null; isActive: boolean; trackInventory: boolean; inventoryQuantity: number };
type ProductPurchaseActionsProps = {
  productId: string;
  productName: string;
  productImageUrl?: string | null;
  paymentRequirement: 'FULL' | 'DEPOSIT';
  depositPercent: number;
  variants: ProductVariant[];
  basePrice: string | null;
  purchaseAllowed?: boolean;
  selectedPaymentMode?: 'full' | 'deposit';
};

export function ProductPurchaseActions({
  productId,
  productName,
  productImageUrl,
  paymentRequirement,
  depositPercent,
  variants,
  basePrice,
  purchaseAllowed = true,
  selectedPaymentMode = 'full'
}: ProductPurchaseActionsProps) {
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [showVariantWarning, setShowVariantWarning] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const activeVariants = variants.filter((variant) => variant.isActive && (!variant.trackInventory || variant.inventoryQuantity > 0));
  const hasVariants = activeVariants.length > 0;
  const disabled = !purchaseAllowed || (variants.length > 0 && activeVariants.length === 0);
  const selectedVariant = activeVariants.find((variant) => variant.id === selectedVariantId);

  // Chuyển đổi selectedPaymentMode thành paymentRequirement thực tế
  const effectivePaymentRequirement = selectedPaymentMode === 'deposit' && paymentRequirement === 'DEPOSIT'
    ? 'DEPOSIT'
    : 'FULL';

  function validateAddToCart() {
    if (hasVariants && !selectedVariantId) {
      setShowVariantWarning(true);
      return false;
    }
    setShowVariantWarning(false);
    return true;
  }

  return (
    <div className="purchase-actions-wrapper">
      {hasVariants ? <ProductVariantSelector variants={activeVariants} basePrice={basePrice} onVariantChange={(variantId) => { setSelectedVariantId(variantId); setShowVariantWarning(false); }} /> : null}
      {showVariantWarning ? <p className="variant-warning" role="alert">Vui lòng chọn phiên bản còn hàng trước khi thêm vào giỏ.</p> : null}
      {disabled ? <p className="variant-warning" role="status">Sản phẩm hiện đã hết hàng.</p> : null}

      <div className="purchase-actions">
        <div className="product-quantity-control" aria-label="Số lượng sản phẩm">
          <button type="button" aria-label="Giảm số lượng" disabled={quantity <= 1} onClick={() => setQuantity((current) => Math.max(1, current - 1))}>−</button>
          <output aria-live="polite">{quantity}</output>
          <button type="button" aria-label="Tăng số lượng" disabled={quantity >= 99} onClick={() => setQuantity((current) => Math.min(99, current + 1))}>+</button>
        </div>
        <AddToCartButton
          productId={productId}
          productName={productName}
          productImageUrl={productImageUrl}
          unitPrice={selectedVariant?.price ?? basePrice ?? '0'}
          paymentRequirement={effectivePaymentRequirement}
          depositPercent={depositPercent}
          variantId={selectedVariantId}
          variantName={selectedVariant?.name}
          label="Thêm vào giỏ"
          beforeAdd={validateAddToCart}
          disabled={disabled}
          quantity={quantity}
        />
      </div>
    </div>
  );
}
