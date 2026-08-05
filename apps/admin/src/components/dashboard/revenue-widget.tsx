'use client';

import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { useEffect, useState } from 'react';
import { adminFetch, getAdminToken } from '../../lib/browser-api';

type Order = {
    id: string;
    totalAmount: number;
    createdAt: string;
    status: string;
};

export function RevenueWidget() {
    const [revenue, setRevenue] = useState({
        today: 0,
        week: 0,
        month: 0,
        trend: 0,
        isPositive: true
    });
    const [loading, setLoading] = useState(true);

    async function loadRevenue() {
        if (!getAdminToken()) {
            setLoading(false);
            return;
        }

        try {
            const response = await adminFetch<{ data: Order[] }>('/orders?pageSize=1000');
            const orders = response.data.filter((o) => o.status !== 'cancelled');

            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

            let todayRevenue = 0;
            let weekRevenue = 0;
            let monthRevenue = 0;
            let lastMonthRevenue = 0;

            orders.forEach((order) => {
                const orderDate = new Date(order.createdAt);
                const amount = order.totalAmount || 0;

                if (orderDate >= todayStart) {
                    todayRevenue += amount;
                }
                if (orderDate >= weekStart) {
                    weekRevenue += amount;
                }
                if (orderDate >= monthStart) {
                    monthRevenue += amount;
                }
                if (orderDate >= lastMonthStart && orderDate <= lastMonthEnd) {
                    lastMonthRevenue += amount;
                }
            });

            const trend = lastMonthRevenue > 0
                ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
                : monthRevenue > 0 ? 100 : 0;

            setRevenue({
                today: todayRevenue,
                week: weekRevenue,
                month: monthRevenue,
                trend: Math.abs(trend),
                isPositive: trend >= 0
            });
        } catch (error) {
            console.error('Failed to load revenue:', error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadRevenue();
        window.addEventListener('admin:data-changed', loadRevenue);
        return () => window.removeEventListener('admin:data-changed', loadRevenue);
    }, []);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            minimumFractionDigits: 0
        }).format(amount);
    };

    if (loading) {
        return (
            <div className="dashboard-card">
                <h2 className="card-title">Revenue</h2>
                <div className="loading-skeleton">
                    <div className="skeleton-bar" />
                    <div className="skeleton-bar" />
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-card revenue-widget">
            <div className="card-header-row">
                <div>
                    <h2 className="card-title">Revenue</h2>
                    <p className="card-subtitle">Doanh thu</p>
                </div>
                <div className="revenue-trend">
                    {revenue.isPositive ? (
                        <TrendingUp size={20} className="trend-up" />
                    ) : (
                        <TrendingDown size={20} className="trend-down" />
                    )}
                    <span className={revenue.isPositive ? 'trend-up' : 'trend-down'}>
                        {revenue.trend.toFixed(1)}%
                    </span>
                </div>
            </div>

            <div className="revenue-stats">
                <div className="revenue-stat revenue-primary">
                    <div className="revenue-icon">
                        <DollarSign size={24} />
                    </div>
                    <div className="revenue-content">
                        <p className="revenue-label">Hôm nay</p>
                        <h3 className="revenue-value">{formatCurrency(revenue.today)}</h3>
                    </div>
                </div>

                <div className="revenue-stat">
                    <div className="revenue-content">
                        <p className="revenue-label">Tuần này</p>
                        <h4 className="revenue-value-small">{formatCurrency(revenue.week)}</h4>
                    </div>
                </div>

                <div className="revenue-stat">
                    <div className="revenue-content">
                        <p className="revenue-label">Tháng này</p>
                        <h4 className="revenue-value-small">{formatCurrency(revenue.month)}</h4>
                    </div>
                </div>
            </div>
        </div>
    );
}
