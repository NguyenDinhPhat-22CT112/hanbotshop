'use client';

import { useState } from 'react';
import { ProductPaymentSelector } from './product-payment-selector';
import { ProductPurchaseActions } from './product-purchase-actions';

type ProductVariant = {
    id: string;
    name: string;
    price: string | null;
    isActive: boolean;
    trackInventory: boolean;
    inventoryQuantity: number
};

type ProductDetailClientProps = {
    productId: string;
    productName: string;
    productImageUrl?: string | null;
    paymentRequirement: 'FULL' | 'DEPOSIT';
    depositPercent: number;
    variants: ProductVariant[];
    basePrice: string | null;
    fullPrice: string;
    depositPrice?: string | null;
    purchaseAllowed?: boolean;
};

export function ProductDetailClient({
    productId,
    productName,
    productImageUrl,
    paymentRequirement,
    depositPercent,
    variants,
    basePrice,
    fullPrice,
    depositPrice,
    purchaseAllowed = true
}: ProductDetailClientProps) {
    const canSelectDeposit = paymentRequirement === 'DEPOSIT' && Boolean(depositPrice && depositPrice !== fullPrice);
    const [selectedPaymentMode, setSelectedPaymentMode] = useState<'full' | 'deposit'>(canSelectDeposit ? 'deposit' : 'full');

    return (
        <>
            <ProductPaymentSelector
                fullPrice={fullPrice}
                depositPrice={depositPrice}
                selectedMode={selectedPaymentMode}
                onModeChange={setSelectedPaymentMode}
            />

            <ProductPurchaseActions
                productId={productId}
                productName={productName}
                productImageUrl={productImageUrl}
                paymentRequirement={paymentRequirement}
                depositPercent={depositPercent}
                variants={variants}
                basePrice={basePrice}
                purchaseAllowed={purchaseAllowed}
                selectedPaymentMode={selectedPaymentMode}
            />
        </>
    );
}
