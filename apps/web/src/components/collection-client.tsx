'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';
import type { ProductAvailability } from '@hanbotorder/types';
import type { Category, FilterOptions, ProductFilters } from '../lib/api';
import { ProductSort } from './product-sort';
import { ActiveFilters } from './active-filters';
import { ProductFiltersPanel } from './product-filters-panel';

type CollectionClientProps = {
    initialCategories: Category[];
    initialFilterOptions: FilterOptions | null;
};

export function CollectionClient({ initialCategories, initialFilterOptions }: CollectionClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [showFilterPanel, setShowFilterPanel] = useState(false);

    // Parse current filters from URL
    const currentFilters = parseFiltersFromUrl(searchParams);

    const updateFilters = useCallback(
        (newFilters: Partial<ProductFilters>) => {
            const merged = { ...currentFilters, ...newFilters };
            const queryString = buildQueryString(merged);

            startTransition(() => {
                router.push(`/collections/tat-ca-san-pham${queryString ? `?${queryString}` : ''}`);
            });
        },
        [currentFilters, router]
    );

    const removeFilter = useCallback(
        (filterKey: keyof ProductFilters, value?: string) => {
            const updated = { ...currentFilters };

            if (filterKey === 'tags' && value && Array.isArray(updated.tags)) {
                updated.tags = updated.tags.filter((tag) => tag !== value);
                if (updated.tags.length === 0) {
                    delete updated.tags;
                }
            } else {
                delete updated[filterKey];
            }

            const queryString = buildQueryString(updated);
            startTransition(() => {
                router.push(`/collections/tat-ca-san-pham${queryString ? `?${queryString}` : ''}`);
            });
        },
        [currentFilters, router]
    );

    const clearAllFilters = useCallback(() => {
        startTransition(() => {
            router.push('/collections/tat-ca-san-pham');
        });
    }, [router]);

    const hasActiveFilters = Object.keys(currentFilters).some(
        (key) => key !== 'sortBy' && key !== 'sortOrder' && key !== 'page' && key !== 'pageSize'
    );

    return (
        <>
            <section className="collection-toolbar" aria-label="Bộ lọc sản phẩm">
                <div className="collection-heading-row">
                    <h1>Tất cả sản phẩm</h1>
                    <ProductSort currentSort={currentFilters} onSortChange={updateFilters} />
                </div>

                <div className="collection-filter-row">
                    <button className="filter-toggle" type="button" onClick={() => setShowFilterPanel(!showFilterPanel)}>
                        <svg aria-hidden="true" viewBox="0 0 24 24">
                            <path d="M4 5h16l-6 7v5l-4 2v-7L4 5Z" />
                        </svg>
                        BỘ LỌC
                    </button>
                </div>

                {hasActiveFilters && (
                    <ActiveFilters
                        filters={currentFilters}
                        categories={initialCategories}
                        filterOptions={initialFilterOptions}
                        onRemove={removeFilter}
                        onClearAll={clearAllFilters}
                    />
                )}
            </section>

            {showFilterPanel && (
                <ProductFiltersPanel
                    currentFilters={currentFilters}
                    categories={initialCategories}
                    filterOptions={initialFilterOptions}
                    onFilterChange={updateFilters}
                    onClose={() => setShowFilterPanel(false)}
                />
            )}

            {isPending && (
                <div className="loading-overlay" aria-live="polite" aria-busy="true">
                    <span>Đang tải...</span>
                </div>
            )}
        </>
    );
}

function parseFiltersFromUrl(searchParams: URLSearchParams): ProductFilters {
    const filters: ProductFilters = {};

    const q = searchParams.get('q');
    if (q) filters.q = q;

    const categoryId = searchParams.get('categoryId');
    if (categoryId) filters.categoryId = categoryId;

    const availability = searchParams.get('availability') as ProductAvailability | null;
    if (availability) filters.availability = availability;

    const tags = searchParams.get('tags');
    if (tags) filters.tags = tags.split(',').filter(Boolean);

    const studio = searchParams.get('studio');
    if (studio) filters.studio = studio;

    const minPrice = searchParams.get('minPrice');
    if (minPrice) filters.minPrice = Number(minPrice);

    const maxPrice = searchParams.get('maxPrice');
    if (maxPrice) filters.maxPrice = Number(maxPrice);

    const sortBy = searchParams.get('sortBy') as 'createdAt' | 'name' | 'price' | null;
    if (sortBy) filters.sortBy = sortBy;

    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' | null;
    if (sortOrder) filters.sortOrder = sortOrder;

    const page = searchParams.get('page');
    if (page) filters.page = Number(page);

    return filters;
}

function buildQueryString(filters: ProductFilters): string {
    const params = new URLSearchParams();

    if (filters.q) params.set('q', filters.q);
    if (filters.categoryId) params.set('categoryId', filters.categoryId);
    if (filters.availability) params.set('availability', filters.availability);
    if (filters.tags?.length) params.set('tags', filters.tags.join(','));
    if (filters.studio) params.set('studio', filters.studio);
    if (filters.minPrice) params.set('minPrice', filters.minPrice.toString());
    if (filters.maxPrice) params.set('maxPrice', filters.maxPrice.toString());
    if (filters.sortBy) params.set('sortBy', filters.sortBy);
    if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);
    if (filters.page && filters.page > 1) params.set('page', filters.page.toString());

    return params.toString();
}
