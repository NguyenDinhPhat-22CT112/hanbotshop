'use client';

import { Package, ShoppingCart, Users, Factory } from 'lucide-react';
import { useEffect, useState } from 'react';
import { adminFetch, getAdminToken } from '../../lib/browser-api';

type ListResponse = {
    data: unknown[];
    meta?: {
        total: number;
    };
};

type StatItem = {
    label: string;
    value: string;
    icon: typeof Package;
    trend?: string;
    color: string;
};

export function QuickStats() {
    const [stats, setStats] = useState<StatItem[]>([]);
    const [loading, setLoading] = useState(true);

    async function loadStats() {
        if (!getAdminToken()) {
            setLoading(false);
            return;
        }

        try {
            const [products, orders, users, jobs] = await Promise.all([
                adminFetch<ListResponse>('/admin/products?pageSize=1'),
                adminFetch<ListResponse>('/orders?pageSize=1'),
                adminFetch<ListResponse>('/users?pageSize=1'),
                adminFetch<ListResponse>('/production-jobs?pageSize=1')
            ]);

            setStats([
                {
                    label: 'Tổng sản phẩm',
                    value: String(products.meta?.total ?? 0),
                    icon: Package,
                    color: 'blue'
                },
                {
                    label: 'Đơn hàng',
                    value: String(orders.meta?.total ?? 0),
                    icon: ShoppingCart,
                    color: 'green'
                },
                {
                    label: 'Khách hàng',
                    value: String(users.meta?.total ?? 0),
                    icon: Users,
                    color: 'purple'
                },
                {
                    label: 'Resin Production',
                    value: String(jobs.meta?.total ?? 0),
                    icon: Factory,
                    color: 'orange'
                }
            ]);
        } catch (error) {
            console.error('Failed to load stats:', error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadStats();
        window.addEventListener('admin:data-changed', loadStats);
        return () => window.removeEventListener('admin:data-changed', loadStats);
    }, []);

    if (loading) {
        return (
            <div className="quick-stats-grid">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="stat-card skeleton">
                        <div className="skeleton-icon" />
                        <div className="skeleton-text" />
                        <div className="skeleton-number" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="quick-stats-grid">
            {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                    <div key={stat.label} className={`stat-card stat-${stat.color}`}>
                        <div className="stat-header">
                            <div className={`stat-icon stat-icon-${stat.color}`}>
                                <Icon size={24} strokeWidth={2} />
                            </div>
                        </div>
                        <div className="stat-content">
                            <p className="stat-label">{stat.label}</p>
                            <h3 className="stat-value">{stat.value}</h3>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
