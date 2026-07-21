'use client';

import type { Category, FilterOptions, ProductFilters } from '../lib/api';
import { labelOf } from '../lib/labels';

type ActiveFiltersProps = {
    filters: ProductFilters;
    categories: Category[];
    filterOptions: FilterOptions | null;
    onRemove: (filterKey: keyof ProductFilters, value?: string) => void;
    onClearAll: () => void;
};

export function ActiveFilters({ filters, categories, filterOptions, onRemove, onClearAll }: ActiveFiltersProps) {
    const activeFilters: Array<{ key: keyof ProductFilters; label: string; value?: string }> = [];

    // Search query
    if (filters.q) {
        activeFilters.push({ key: 'q', label: `Tìm kiếm: "${filters.q}"` });
    }

    // Category
    if (filters.categoryId) {
        const category = categories.find((cat) => cat.id === filters.categoryId);
        activeFilters.push({ key: 'categoryId', label: `Danh mục: ${category?.name ?? 'Unknown'}` });
    }

    // Availability
    if (filters.availability) {
        activeFilters.push({ key: 'availability', label: `Trạng thái: ${labelOf(filters.availability)}` });
    }

    // Studio
    if (filters.studio) {
        activeFilters.push({ key: 'studio', label: `Thương hiệu: ${filters.studio}` });
    }

    // Tags
    if (filters.tags && filters.tags.length > 0) {
        filters.tags.forEach((tag) => {
            const tagOption = filterOptions?.tags.find((t) => t.slug === tag || t.name === tag);
            activeFilters.push({ key: 'tags', label: `Tag: ${tagOption?.name ?? tag}`, value: tag });
        });
    }

    // Price range
    if (filters.minPrice || filters.maxPrice) {
        const priceLabel = [];
        if (filters.minPrice) priceLabel.push(`Từ ${formatPrice(filters.minPrice)}`);
        if (filters.maxPrice) priceLabel.push(`Đến ${formatPrice(filters.maxPrice)}`);
        activeFilters.push({ key: 'minPrice', label: `Giá: ${priceLabel.join(' ')}` });
    }

    if (activeFilters.length === 0) {
        return null;
    }

    return (
        <div className="active-filter-row">
            {activeFilters.map((filter, index) => (
                <span key={`${filter.key}-${index}`}>
                    {filter.label}
                    <button
                        type="button"
                        aria-label={`Xóa bộ lọc ${filter.label}`}
                        onClick={() => {
                            // Special handling for price range - remove both min and max
                            if (filter.key === 'minPrice') {
                                onRemove('minPrice');
                                onRemove('maxPrice');
                            } else {
                                onRemove(filter.key, filter.value);
                            }
                        }}
                    >
                        ×
                    </button>
                </span>
            ))}

            <button type="button" className="clear-all-filters" onClick={onClearAll}>
                Xóa tất cả
            </button>
        </div>
    );
}

function formatPrice(price: number): string {
    return new Intl.NumberFormat('vi-VN').format(price) + 'đ';
}
