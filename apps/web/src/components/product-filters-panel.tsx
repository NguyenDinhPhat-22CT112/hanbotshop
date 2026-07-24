'use client';

import { useState } from 'react';
import type { ProductAvailability } from '@hanbotorder/types';
import type { Category, FilterOptions, ProductFilters } from '../lib/api';
import { labelOf } from '../lib/labels';

type ProductFiltersPanelProps = {
    currentFilters: ProductFilters;
    categories: Category[];
    filterOptions: FilterOptions | null;
    onFilterChange: (filters: Partial<ProductFilters>) => void;
    onClose: () => void;
};

export function ProductFiltersPanel({ currentFilters, categories, filterOptions, onFilterChange, onClose }: ProductFiltersPanelProps) {
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        category: true,
        availability: true,
        studio: false,
        tags: false,
        price: false
    });

    const toggleSection = (section: string) => {
        setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
    };

    const handleCategoryChange = (categoryId: string) => {
        onFilterChange({ categoryId: currentFilters.categoryId === categoryId ? undefined : categoryId });
    };

    const handleAvailabilityChange = (availability: ProductAvailability) => {
        onFilterChange({ availability: currentFilters.availability === availability ? undefined : availability });
    };

    const handleStudioChange = (studio: string) => {
        onFilterChange({ studio: currentFilters.studio === studio ? undefined : studio });
    };

    const handleTagToggle = (tagSlug: string) => {
        const currentTags = currentFilters.tags || [];
        const newTags = currentTags.includes(tagSlug) ? currentTags.filter((t) => t !== tagSlug) : [...currentTags, tagSlug];
        onFilterChange({ tags: newTags.length > 0 ? newTags : undefined });
    };

    const handlePriceChange = (min?: number, max?: number) => {
        onFilterChange({
            minPrice: min || undefined,
            maxPrice: max || undefined
        });
    };

    return (
        <div className="filter-panel-overlay" onClick={onClose}>
            <aside className="filter-panel" onClick={(e) => e.stopPropagation()} aria-label="Bộ lọc sản phẩm">
                <div className="filter-panel-header">
                    <h2>Bộ lọc</h2>
                    <button type="button" className="filter-panel-close" onClick={onClose} aria-label="Đóng bộ lọc">
                        ×
                    </button>
                </div>

                <div className="filter-panel-content">
                    {/* Category Filter */}
                    <div className="filter-group">
                        <button type="button" className="filter-group-header" onClick={() => toggleSection('category')}>
                            <h3>Danh mục</h3>
                            <span aria-hidden="true">{expandedSections.category ? '−' : '+'}</span>
                        </button>
                        {expandedSections.category && (
                            <div className="filter-group-content">
                                {categories.map((category) => (
                                    <label key={category.id} className="filter-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={currentFilters.categoryId === category.id}
                                            onChange={() => handleCategoryChange(category.id)}
                                        />
                                        <span>
                                            {category.name} <small>({category._count.products})</small>
                                        </span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Availability Filter */}
                    <div className="filter-group">
                        <button type="button" className="filter-group-header" onClick={() => toggleSection('availability')}>
                            <h3>Trạng thái</h3>
                            <span aria-hidden="true">{expandedSections.availability ? '−' : '+'}</span>
                        </button>
                        {expandedSections.availability && filterOptions && (
                            <div className="filter-group-content">
                                {filterOptions.availabilityOptions.map((option) => (
                                    <label key={option.value} className="filter-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={currentFilters.availability === option.value}
                                            onChange={() => handleAvailabilityChange(option.value)}
                                        />
                                        <span>
                                            {labelOf(option.value)} <small>({option.count})</small>
                                        </span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Studio Filter */}
                    <div className="filter-group">
                        <button type="button" className="filter-group-header" onClick={() => toggleSection('studio')}>
                            <h3>Thương hiệu</h3>
                            <span aria-hidden="true">{expandedSections.studio ? '−' : '+'}</span>
                        </button>
                        {expandedSections.studio && filterOptions && (
                            <div className="filter-group-content">
                                {filterOptions.studios.map((studio) => (
                                    <label key={studio.name} className="filter-checkbox">
                                        <input type="checkbox" checked={currentFilters.studio === studio.name} onChange={() => handleStudioChange(studio.name)} />
                                        <span>
                                            {studio.name} <small>({studio.count})</small>
                                        </span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Tags Filter */}
                    <div className="filter-group">
                        <button type="button" className="filter-group-header" onClick={() => toggleSection('tags')}>
                            <h3>Tags</h3>
                            <span aria-hidden="true">{expandedSections.tags ? '−' : '+'}</span>
                        </button>
                        {expandedSections.tags && filterOptions && (
                            <div className="filter-group-content">
                                {filterOptions.tags.slice(0, 20).map((tag) => (
                                    <label key={tag.id} className="filter-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={currentFilters.tags?.includes(tag.slug) ?? false}
                                            onChange={() => handleTagToggle(tag.slug)}
                                        />
                                        <span>
                                            {tag.name} <small>({tag.count})</small>
                                        </span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Price Range Filter */}
                    <div className="filter-group">
                        <button type="button" className="filter-group-header" onClick={() => toggleSection('price')}>
                            <h3>Khoảng giá</h3>
                            <span aria-hidden="true">{expandedSections.price ? '−' : '+'}</span>
                        </button>
                        {expandedSections.price && (
                            <div className="filter-group-content">
                                <div className="price-range-inputs">
                                    <label>
                                        <span>Từ</span>
                                        <input
                                            type="number"
                                            placeholder="0"
                                            value={currentFilters.minPrice ?? ''}
                                            onChange={(e) => handlePriceChange(e.target.value ? Number(e.target.value) : undefined, currentFilters.maxPrice)}
                                        />
                                    </label>
                                    <label>
                                        <span>Đến</span>
                                        <input
                                            type="number"
                                            placeholder="∞"
                                            value={currentFilters.maxPrice ?? ''}
                                            onChange={(e) => handlePriceChange(currentFilters.minPrice, e.target.value ? Number(e.target.value) : undefined)}
                                        />
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </aside>
        </div>
    );
}
