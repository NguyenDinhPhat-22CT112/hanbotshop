'use client';

import { useState, useRef, useEffect } from 'react';
import type { ProductFilters } from '../lib/api';

type SortOption = {
    label: string;
    sortBy: 'createdAt' | 'name' | 'price';
    sortOrder: 'asc' | 'desc';
};

const sortOptions: SortOption[] = [
    { label: 'Mới nhất', sortBy: 'createdAt', sortOrder: 'desc' },
    { label: 'Tên (A-Z)', sortBy: 'name', sortOrder: 'asc' },
    { label: 'Giá: Thấp đến Cao', sortBy: 'price', sortOrder: 'asc' },
    { label: 'Giá: Cao đến Thấp', sortBy: 'price', sortOrder: 'desc' }
];

type ProductSortProps = {
    currentSort: ProductFilters;
    onSortChange: (filters: Partial<ProductFilters>) => void;
};

export function ProductSort({ currentSort, onSortChange }: ProductSortProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedOption =
        sortOptions.find((opt) => opt.sortBy === currentSort.sortBy && opt.sortOrder === currentSort.sortOrder) || sortOptions[0];

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    const handleSelect = (option: SortOption) => {
        onSortChange({
            sortBy: option.sortBy,
            sortOrder: option.sortOrder
        });
        setIsOpen(false);
    };

    return (
        <div className="sort-dropdown" ref={dropdownRef}>
            <button className="collection-sort" type="button" onClick={() => setIsOpen(!isOpen)} aria-haspopup="true" aria-expanded={isOpen}>
                <span aria-hidden="true">↕</span>
                Sắp xếp: <strong>{selectedOption.label}</strong>
                <i aria-hidden="true" />
            </button>

            {isOpen && (
                <div className="sort-dropdown-menu" role="menu">
                    {sortOptions.map((option) => (
                        <button
                            key={`${option.sortBy}-${option.sortOrder}`}
                            type="button"
                            role="menuitem"
                            className={option === selectedOption ? 'selected' : ''}
                            onClick={() => handleSelect(option)}
                        >
                            {option.label}
                            {option === selectedOption && <span aria-hidden="true">✓</span>}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
