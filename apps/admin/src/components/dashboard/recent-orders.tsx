'use client';

import { useEffect, useState } from 'react';
import { adminFetch, getAdminToken } from '../../lib/browser-api';
import { ExternalLink, Clock } from 'lucide-react';
import Link from 'next/link';

type Order = {
    id: string;
    orderNumber: string;
    customerName?: string;
    totalAmount: number;
    paymentStatus: string;
    status: string;
    createdAt: string;
};

export function RecentOrders() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    async function loadRecentOrders() {
        if (!getAdminToken()) {
            setLoading(false);
            return;
        }

        try {
            const response = await adminFetch<{ data: Order[] }>('/orders?pageSize=5&sort=-createdAt');
            setOrders(response.data);
        } catch (error) {
            console.error('Failed to load recent orders:', error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadRecentOrders();
        window.addEventListener('admin:data-changed', loadRecentOrders);
        return () => window.removeEventListener('admin:data-changed', loadRecentOrders);
    }, []);

    const getStatusColor = (status: string) => {
        const statusMap: Record<string, string> = {
            pending: 'yellow',
            confirmed: 'blue',
            packing: 'purple',
            shipping: 'cyan',
            completed: 'green',
            cancelled: 'red'
        };
        return statusMap[status?.toLowerCase()] || 'gray';
    };

    const getPaymentColor = (status: string) => {
        const statusMap: Record<string, string> = {
            paid: 'green',
            pending: 'yellow',
            failed: 'red'
        };
        return statusMap[status?.toLowerCase()] || 'gray';
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 60) return `${diffMins} phút trước`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)} giờ trước`;
        return `${Math.floor(diffMins / 1440)} ngày trước`;
    };

    if (loading) {
        return (
            <div className="dashboard-card">
                <h2 className="card-title">Recent Orders</h2>
                <div className="loading-skeleton">
                    <div className="skeleton-card" />
                    <div className="skeleton-card" />
                    <div className="skeleton-card" />
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-card">
            <div className="card-header-row">
                <div>
                    <h2 className="card-title">Recent Orders</h2>
                    <p className="card-subtitle">Đơn hàng mới nhất</p>
                </div>
                <Link href="/orders" className="view-all-link">
                    Xem tất cả
                </Link>
            </div>

            <div className="recent-orders-list">
                {orders.length === 0 ? (
                    <div className="empty-state">
                        <p>Chưa có đơn hàng nào</p>
                    </div>
                ) : (
                    orders.map((order) => (
                        <div key={order.id} className="recent-order-card">
                            <div className="order-card-header">
                                <div>
                                    <Link href={`/orders/${order.id}`} className="order-number">
                                        {order.orderNumber}
                                    </Link>
                                    <p className="order-customer">{order.customerName || 'Guest'}</p>
                                </div>
                                <Link href={`/orders/${order.id}`} className="order-view-button">
                                    <ExternalLink size={16} />
                                </Link>
                            </div>

                            <div className="order-card-body">
                                <div className="order-amount">
                                    {new Intl.NumberFormat('vi-VN', {
                                        style: 'currency',
                                        currency: 'VND'
                                    }).format(order.totalAmount)}
                                </div>

                                <div className="order-badges">
                                    <span className={`badge badge-${getStatusColor(order.status)}`}>
                                        {order.status}
                                    </span>
                                    <span className={`badge badge-${getPaymentColor(order.paymentStatus)}`}>
                                        {order.paymentStatus}
                                    </span>
                                </div>

                                <div className="order-time">
                                    <Clock size={12} />
                                    <span>{formatTime(order.createdAt)}</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
