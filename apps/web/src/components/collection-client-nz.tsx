'use client';

import { useRouter } from 'next/navigation';
import type { CSSProperties } from 'react';
import { useCallback, useMemo, useState, useTransition } from 'react';
import type { ProductAvailability } from '@hanbotorder/types';
import type { Category, FilterOptions, ProductFilters } from '../lib/api';

type CollectionClientNZProps = {
  initialCategories: Category[];
  initialFilterOptions: FilterOptions | null;
  currentFilters: ProductFilters;
};

const priceBounds = {
  min: 0,
  max: 20_000_000,
  step: 100_000
};

const availabilityLabels: Record<ProductAvailability, string> = {
  PRE_ORDER: 'Pre-order',
  ORDER: 'Đặt hàng',
  IN_STOCK: 'Có sẵn',
  SALE: 'Sale',
  CONTACT: 'Liên hệ'
};

function formatPrice(value: number) {
  return `${new Intl.NumberFormat('vi-VN').format(value)}đ`;
}

function clampPrice(value: number) {
  return Math.min(priceBounds.max, Math.max(priceBounds.min, value));
}

export function CollectionClientNZ({ initialCategories, initialFilterOptions, currentFilters }: CollectionClientNZProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    category: true,
    availability: true,
    price: true,
    sort: true
  });

  const initialMin = clampPrice(currentFilters.minPrice ?? priceBounds.min);
  const initialMax = clampPrice(currentFilters.maxPrice ?? priceBounds.max);
  const [draftMinPrice, setDraftMinPrice] = useState(Math.min(initialMin, initialMax - priceBounds.step));
  const [draftMaxPrice, setDraftMaxPrice] = useState(Math.max(initialMax, initialMin + priceBounds.step));

  const rangeStyle = useMemo(() => {
    const minPercent = ((draftMinPrice - priceBounds.min) / (priceBounds.max - priceBounds.min)) * 100;
    const maxPercent = ((draftMaxPrice - priceBounds.min) / (priceBounds.max - priceBounds.min)) * 100;

    return {
      '--range-start': `${minPercent}%`,
      '--range-end': `${maxPercent}%`
    } as CSSProperties;
  }, [draftMinPrice, draftMaxPrice]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const updateFilters = useCallback(
    (newFilters: Partial<ProductFilters>) => {
      const merged = { ...currentFilters, ...newFilters, page: undefined };
      const queryString = buildQueryString(merged);

      startTransition(() => {
        router.push(`/collections/tat-ca-san-pham${queryString ? `?${queryString}` : ''}`);
      });
    },
    [currentFilters, router]
  );

  const toggleAvailability = (availability: ProductAvailability) => {
    updateFilters({
      availability: currentFilters.availability === availability ? undefined : availability
    });
  };

  const toggleCategory = (categoryId: string) => {
    updateFilters({
      categoryId: currentFilters.categoryId === categoryId ? undefined : categoryId
    });
  };

  const applyPriceRange = () => {
    updateFilters({
      minPrice: draftMinPrice > priceBounds.min ? draftMinPrice : undefined,
      maxPrice: draftMaxPrice < priceBounds.max ? draftMaxPrice : undefined
    });
  };

  const updateSort = (sortBy: 'createdAt' | 'name' | 'price', sortOrder: 'asc' | 'desc') => {
    updateFilters({ sortBy, sortOrder });
  };

  const clearFilters = () => {
    startTransition(() => {
      router.push('/collections/tat-ca-san-pham');
    });
  };

  const hasFilters = Object.keys(currentFilters).some((key) => key !== 'sortBy' && key !== 'sortOrder' && key !== 'page' && key !== 'pageSize');

  return (
    <aside className="nz-sidebar-filters">
      <div className="nz-filters-header">
        <h2>BỘ LỌC</h2>
        {hasFilters ? (
          <button type="button" onClick={clearFilters} className="nz-clear-all">
            Xóa tất cả
          </button>
        ) : null}
      </div>

      <div className="nz-filter-group">
        <button type="button" className="nz-filter-title" onClick={() => toggleSection('category')}>
          <span>Thương hiệu</span>
          <span className="nz-toggle-icon">{expandedSections.category ? '−' : '+'}</span>
        </button>
        {expandedSections.category ? (
          <div className="nz-filter-options">
            {initialCategories.map((category) => (
              <label key={category.id} className="nz-filter-checkbox">
                <input type="checkbox" checked={currentFilters.categoryId === category.id} onChange={() => toggleCategory(category.id)} />
                <span>{category.name}</span>
              </label>
            ))}
          </div>
        ) : null}
      </div>

      <div className="nz-filter-group">
        <button type="button" className="nz-filter-title" onClick={() => toggleSection('availability')}>
          <span>Lọc đặc</span>
          <span className="nz-toggle-icon">{expandedSections.availability ? '−' : '+'}</span>
        </button>
        {expandedSections.availability ? (
          <div className="nz-filter-options">
            {(['PRE_ORDER', 'ORDER', 'CONTACT'] as ProductAvailability[]).map((availability) => {
              const count = initialFilterOptions?.availabilityOptions.find((option) => option.value === availability)?.count ?? 0;

              return (
                <label key={availability} className="nz-filter-checkbox">
                  <input type="checkbox" checked={currentFilters.availability === availability} onChange={() => toggleAvailability(availability)} />
                  <span>{availabilityLabels[availability]}</span>
                  <span className="nz-filter-count">({count})</span>
                </label>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="nz-filter-group">
        <button type="button" className="nz-filter-title" onClick={() => toggleSection('price')}>
          <span>Khoảng giá</span>
          <span className="nz-toggle-icon">{expandedSections.price ? '−' : '+'}</span>
        </button>
        {expandedSections.price ? (
          <div className="nz-filter-price-range">
            <div className="nz-price-slider" style={rangeStyle}>
              <div className="nz-price-slider-track" />
              <input
                type="range"
                min={priceBounds.min}
                max={priceBounds.max}
                step={priceBounds.step}
                value={draftMinPrice}
                aria-label="Giá thấp nhất"
                onChange={(event) => {
                  const nextValue = Math.min(Number(event.target.value), draftMaxPrice - priceBounds.step);
                  setDraftMinPrice(clampPrice(nextValue));
                }}
              />
              <input
                type="range"
                min={priceBounds.min}
                max={priceBounds.max}
                step={priceBounds.step}
                value={draftMaxPrice}
                aria-label="Giá cao nhất"
                onChange={(event) => {
                  const nextValue = Math.max(Number(event.target.value), draftMinPrice + priceBounds.step);
                  setDraftMaxPrice(clampPrice(nextValue));
                }}
              />
            </div>

            <div className="nz-price-filter-summary">
              <button type="button" onClick={applyPriceRange}>
                Lọc
              </button>
              <span>
                Giá từ <strong>{formatPrice(draftMinPrice)}</strong> — <strong>{formatPrice(draftMaxPrice)}</strong>
              </span>
            </div>
          </div>
        ) : null}
      </div>

      <div className="nz-filter-group">
        <button type="button" className="nz-filter-title" onClick={() => toggleSection('sort')}>
          <span>Sắp xếp</span>
          <span className="nz-toggle-icon">{expandedSections.sort ? '−' : '+'}</span>
        </button>
        {expandedSections.sort ? (
          <div className="nz-filter-options">
            <label className="nz-filter-radio">
              <input type="radio" checked={!currentFilters.sortBy} onChange={() => updateSort('createdAt', 'desc')} />
              <span>Mặc định</span>
            </label>
            <label className="nz-filter-radio">
              <input type="radio" checked={currentFilters.sortBy === 'name' && currentFilters.sortOrder === 'asc'} onChange={() => updateSort('name', 'asc')} />
              <span>Tên: A-Z</span>
            </label>
            <label className="nz-filter-radio">
              <input type="radio" checked={currentFilters.sortBy === 'price' && currentFilters.sortOrder === 'asc'} onChange={() => updateSort('price', 'asc')} />
              <span>Giá: Thấp đến cao</span>
            </label>
            <label className="nz-filter-radio">
              <input type="radio" checked={currentFilters.sortBy === 'price' && currentFilters.sortOrder === 'desc'} onChange={() => updateSort('price', 'desc')} />
              <span>Giá: Cao đến thấp</span>
            </label>
          </div>
        ) : null}
      </div>

      {isPending ? (
        <div className="nz-filters-loading">
          <span>Đang tải...</span>
        </div>
      ) : null}
    </aside>
  );
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
