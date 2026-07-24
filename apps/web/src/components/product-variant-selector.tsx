'use client';

import { useState } from 'react';

type ProductVariant = {
    id: string;
    name: string;
    price: string | null;
    isActive: boolean;
    trackInventory: boolean;
    inventoryQuantity: number;
};

type ProductVariantSelectorProps = {
    variants: ProductVariant[];
    basePrice: string | null;
    onVariantChange: (variantId: string | null) => void;
};

function formatVnd(value: string | null) {
    if (!value) return null;

    const numericValue = Number(value);
    if (Number.isNaN(numericValue)) return value;

    return `${new Intl.NumberFormat('vi-VN').format(numericValue)}đ`;
}

export function ProductVariantSelector({ variants, basePrice, onVariantChange }: ProductVariantSelectorProps) {
    const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

    const activeVariants = variants.filter(v => v.isActive && (!v.trackInventory || v.inventoryQuantity > 0));

    // If no variants, don't render anything
    if (activeVariants.length === 0) {
        return null;
    }

    function handleSelect(variantId: string) {
        setSelectedVariantId(variantId);
        onVariantChange(variantId);
    }

    return (
        <div className="variant-selector">
            <strong>Chọn phiên bản:</strong>
            <div className="variant-options">
                {activeVariants.map((variant) => {
                    const isSelected = selectedVariantId === variant.id;
                    const displayPrice = formatVnd(variant.price ?? basePrice);

                    return (
                        <button
                            key={variant.id}
                            type="button"
                            className={`variant-option ${isSelected ? 'selected' : ''}`}
                            onClick={() => handleSelect(variant.id)}
                        >
                            <span className="variant-name">{variant.name}</span>
                            {displayPrice && <span className="variant-price">{displayPrice}</span>}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
