'use client';

import { STATUS_COLORS, STATUS_LABELS } from './constants';

interface StatusBadgeProps {
    status: string;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export function StatusBadge({ status, size = 'md', className = '' }: StatusBadgeProps) {
    const colors = STATUS_COLORS[status] || { bg: '#F3F4F6', text: '#4B5563', border: '#E5E7EB' };
    const label = STATUS_LABELS[status] || status;

    const sizeClasses = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-1 text-xs',
        lg: 'px-3 py-1.5 text-sm'
    };

    return (
        <span
            className={`inline-flex items-center font-semibold rounded-full whitespace-nowrap ${sizeClasses[size]} ${className}`}
            style={{
                backgroundColor: colors.bg,
                color: colors.text,
                border: `1px solid ${colors.border}`
            }}
        >
            {label}
        </span>
    );
}
