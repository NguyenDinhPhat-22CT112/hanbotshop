'use client';

import { useEffect, useState } from 'react';
import { adminFetch, getAdminToken } from '../../lib/browser-api';

type Order = {
    id: string;
    status: string;
};

type StatusCount = {
    label: string;
    value: number;
    color: string;
    percentage: number;
};

export function OrderOverview() {
    const [statusCounts, setStatusCounts] = useState<StatusCount[]>([]);
    const [loading, setLoading] = useState(true);

    async function loadOrderStats() {
        if (!getAdminToken()) {
            setLoading(false);
            return;
        }

        try {
            const response = await adminFetch<{ data: Order[] }>('/orders?pageSize=1000');
            const orders = response.data;

            const counts: Record<string, number> = {
                pending: 0,
                confirmed: 0,
                packing: 0,
                shipping: 0,
                completed: 0,
                cancelled: 0
            };

            orders.forEach((order) => {
                const status = order.status?.toLowerCase() || 'pending';
                if (status in counts) {
                    counts[status]++;
                }
            });

            const total = Object.values(counts).reduce((sum, count) => sum + count, 0) || 1;

            const statusData: StatusCount[] = [
                { label: 'Pending', value: counts.pending, color: 'yellow', percentage: (counts.pending / total) * 100 },
                { label: 'Confirmed', value: counts.confirmed, color: 'blue', percentage: (counts.confirmed / total) * 100 },
                { label: 'Packing', value: counts.packing, color: 'purple', percentage: (counts.packing / total) * 100 },
                { label: 'Shipping', value: counts.shipping, color: 'cyan', percentage: (counts.shipping / total) * 100 },
                { label: 'Completed', value: counts.completed, color: 'green', percentage: (counts.completed / total) * 100 },
                { label: 'Cancelled', value: counts.cancelled, color: 'red', percentage: (counts.cancelled / total) * 100 }
            ];

            setStatusCounts(statusData);
        } catch (error) {
            console.error('Failed to load order stats:', error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadOrderStats();
        window.addEventListener('admin:data-changed', loadOrderStats);
        return () => window.removeEventListener('admin:data-changed', loadOrderStats);
    }, []);

    if (loading) {
        return (
            <div className="dashboard-card">
                <h2 className="card-title">Order Overview</h2>
                <div className="loading-skeleton">
                    <div className="skeleton-bar" />
                    <div className="skeleton-bar" />
                    <div className="skeleton-bar" />
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-card">
            <h2 className="card-title">Order Overview</h2>
            <p className="card-subtitle">Tổng quan trạng thái đơn hàng</p>

            <div className="order-status-list">
                {statusCounts.map((status) => (
                    <div key={status.label} className="order-status-item">
                        <div className="status-item-header">
                            <div className="status-info">
                                <span className={`status-badge badge-${status.color}`}>
                                    {status.label}
                                </span>
                                <span className="status-count">{status.value} Orders</span>
                            </div>
                            <span className="status-percentage">
                                {status.percentage.toFixed(1)}%
                            </span>
                        </div>
                        <div className="status-progress-bar">
                            <div
                                className={`status-progress-fill progress-${status.color}`}
                                style={{ width: `${status.percentage}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
