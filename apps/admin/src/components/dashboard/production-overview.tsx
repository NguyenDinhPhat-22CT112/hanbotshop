'use client';

import { useEffect, useState } from 'react';
import { adminFetch, getAdminToken } from '../../lib/browser-api';

type ProductionJob = {
    id: string;
    status: string;
};

type ProductionStatus = {
    label: string;
    value: number;
    color: string;
    percentage: number;
};

export function ProductionOverview() {
    const [statuses, setStatuses] = useState<ProductionStatus[]>([]);
    const [loading, setLoading] = useState(true);

    async function loadProductionStats() {
        if (!getAdminToken()) {
            setLoading(false);
            return;
        }

        try {
            const response = await adminFetch<{ data: ProductionJob[] }>('/production-jobs?pageSize=1000');
            const jobs = response.data;

            const counts: Record<string, number> = {
                'waiting-deposit': 0,
                preparing: 0,
                printing: 0,
                cleaning: 0,
                painting: 0,
                qc: 0,
                packing: 0,
                shipping: 0,
                completed: 0
            };

            jobs.forEach((job) => {
                const status = job.status?.toLowerCase() || 'preparing';
                if (status in counts) {
                    counts[status]++;
                }
            });

            const total = Object.values(counts).reduce((sum, count) => sum + count, 0) || 1;

            const statusData: ProductionStatus[] = [
                { label: 'Waiting Deposit', value: counts['waiting-deposit'], color: 'orange', percentage: (counts['waiting-deposit'] / total) * 100 },
                { label: 'Preparing', value: counts.preparing, color: 'gray', percentage: (counts.preparing / total) * 100 },
                { label: 'Printing', value: counts.printing, color: 'blue', percentage: (counts.printing / total) * 100 },
                { label: 'Cleaning', value: counts.cleaning, color: 'cyan', percentage: (counts.cleaning / total) * 100 },
                { label: 'Painting', value: counts.painting, color: 'purple', percentage: (counts.painting / total) * 100 },
                { label: 'QC', value: counts.qc, color: 'yellow', percentage: (counts.qc / total) * 100 },
                { label: 'Packing', value: counts.packing, color: 'indigo', percentage: (counts.packing / total) * 100 },
                { label: 'Shipping', value: counts.shipping, color: 'teal', percentage: (counts.shipping / total) * 100 },
                { label: 'Completed', value: counts.completed, color: 'green', percentage: (counts.completed / total) * 100 }
            ];

            setStatuses(statusData.filter(s => s.value > 0));
        } catch (error) {
            console.error('Failed to load production stats:', error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadProductionStats();
        window.addEventListener('admin:data-changed', loadProductionStats);
        return () => window.removeEventListener('admin:data-changed', loadProductionStats);
    }, []);

    if (loading) {
        return (
            <div className="dashboard-card">
                <h2 className="card-title">Production Overview</h2>
                <div className="loading-skeleton">
                    <div className="skeleton-bar" />
                    <div className="skeleton-bar" />
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-card">
            <h2 className="card-title">Production Overview</h2>
            <p className="card-subtitle">Tiến độ sản xuất Resin</p>

            <div className="production-grid">
                {statuses.map((status) => (
                    <div key={status.label} className={`production-card production-${status.color}`}>
                        <div className="production-badge">
                            <span className="production-value">{status.value}</span>
                            <span className="production-label">Jobs</span>
                        </div>
                        <p className="production-status">{status.label}</p>
                        <div className="production-progress">
                            <div
                                className="production-progress-fill"
                                style={{ width: `${status.percentage}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
