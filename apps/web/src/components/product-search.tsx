'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { ProductSuggestion } from '../lib/api';
import { getProductSuggestions } from '../lib/api';

type ProductSearchProps = {
    initialQuery?: string;
    placeholder?: string;
    redirectOnSubmit?: boolean;
};

export function ProductSearch({ initialQuery = '', placeholder = 'Tìm kiếm sản phẩm', redirectOnSubmit = false }: ProductSearchProps) {
    const router = useRouter();
    const [query, setQuery] = useState(initialQuery);
    const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const debounceTimerRef = useRef<NodeJS.Timeout>();

    // Fetch suggestions with debounce
    const fetchSuggestions = useCallback(async (searchQuery: string) => {
        if (searchQuery.length < 2) {
            setSuggestions([]);
            setIsOpen(false);
            return;
        }

        setIsLoading(true);
        try {
            const results = await getProductSuggestions(searchQuery);
            setSuggestions(results);
            setIsOpen(results.length > 0);
        } catch (error) {
            console.error('Failed to fetch suggestions:', error);
            setSuggestions([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Debounced input handler
    const handleInputChange = (value: string) => {
        setQuery(value);
        setSelectedIndex(-1);

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
            fetchSuggestions(value);
        }, 300);
    };

    // Handle form submit
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!query.trim()) return;

        if (redirectOnSubmit) {
            // From header - navigate to collection page with search
            router.push(`/san-pham?q=${encodeURIComponent(query.trim())}`);
        } else {
            // Already on collection page - update URL via parent component
            // This would be handled by the parent's filter update mechanism
        }

        setIsOpen(false);
        inputRef.current?.blur();
    };

    // Handle suggestion click
    const handleSuggestionClick = (suggestion: ProductSuggestion) => {
        router.push(`/products/${suggestion.slug}`);
        setIsOpen(false);
    };

    // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen || suggestions.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0 && suggestions[selectedIndex]) {
                    handleSuggestionClick(suggestions[selectedIndex]);
                } else {
                    handleSubmit(e);
                }
                break;
            case 'Escape':
                setIsOpen(false);
                inputRef.current?.blur();
                break;
        }
    };

    // Click outside to close
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node) &&
                inputRef.current &&
                !inputRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Cleanup debounce timer
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    return (
        <form className="header-search" onSubmit={handleSubmit} role="search">
            <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="m20 20-4.4-4.4" />
                <circle cx="11" cy="11" r="6" />
            </svg>
            <input
                ref={inputRef}
                name="q"
                type="search"
                placeholder={placeholder}
                aria-label={placeholder}
                value={query}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                    if (suggestions.length > 0) setIsOpen(true);
                }}
                autoComplete="off"
            />

            {isOpen && suggestions.length > 0 && (
                <div ref={dropdownRef} className="search-suggestions" role="listbox">
                    {suggestions.map((suggestion, index) => (
                        <button
                            key={suggestion.id}
                            type="button"
                            role="option"
                            aria-selected={index === selectedIndex}
                            className={`search-suggestion-item ${index === selectedIndex ? 'selected' : ''}`}
                            onClick={() => handleSuggestionClick(suggestion)}
                        >
                            {suggestion.imageUrl && (
                                <div className="suggestion-image">
                                    <img src={suggestion.imageUrl} alt={suggestion.name} />
                                </div>
                            )}
                            <div className="suggestion-details">
                                <strong>{suggestion.name}</strong>
                                <span className="suggestion-meta">
                                    {suggestion.studio} {suggestion.basePrice && `• ${formatPrice(suggestion.basePrice)}`}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {isLoading && <span className="search-loading" aria-live="polite" aria-label="Đang tìm kiếm..." />}
        </form>
    );
}

function formatPrice(price: string): string {
    const numericValue = Number(price);
    if (Number.isNaN(numericValue)) return price;
    return new Intl.NumberFormat('vi-VN').format(numericValue) + 'đ';
}
