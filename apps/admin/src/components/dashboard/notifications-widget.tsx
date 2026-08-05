'use client';

import { AlertCircle, Clock, DollarSign, Package } from 'lucide-react';
import { useEffect, useState } from 'react';
import { adminFetch, getAdminToken } from '../../lib/browser-api';

type Order = {
    id: string;
    status: string;
    paymentStatus?: string;
};

type ProductionJob = {
    id: string;
    status: string;
};

type Notification = {
    id: string;
    type: 'alert' | 'warning' | 'info';
    message: string;
    count: number;
    color: string;
    icon: typeof AlertCircle;
};

export function NotificationsWidget() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    async function loadNotifications() {
        if (!getAdminToken()) {
            setLoading(false);
            return;
        }

        try {
            const [ordersResponse, jobsResponse] = await Promise.all([
                adminFetch<{ data: Order[] }>('/orders?pageSize=1000'),
                adminFetch<{ data: ProductionJob[] }>('/production-jobs?pageSize=1000')
            ]);

            const orders = ordersResponse.data;
            const jobs = jobsResponse.data;

            // Count orders needing confirmation
            const pendingOrders = orders.filter(o =>
                o.status === 'PENDING_CONFIRMATION' || o.status === 'WAITING_DEPOSIT'
            ).length;

            // Count orders needing payment
            const unpaidOrders = orders.filter(o =>
                o.status === 'WAITING_DEPOSIT' ||
                o.status === 'WAITING_SECOND_PAYMENT' ||
                o.paymentStatus === 'UNPAID' ||
                o.paymentStatus === 'PARTIALLY_PAID'
            ).length;

            // Count production jobs needing painting
            const paintingJobs = jobs.filter(j =>
                j.status === 'PAINTING'
            ).length;

            // Count blocked orders (payment failed)
            const blockedOrders = orders.filter(o =>
                o.status === 'BLOCKED'
            ).length;

            const notifList: Notification[] = [];

            if (pendingOrders > 0) {
                notifList.push({
                    id: '1',
                    type: 'warning',
                    message: 'Đơn cần xác nhận',
                    count: pendingOrders,
                    color: 'yellow',
                    icon: Clock
                });
            }

            if (unpaidOrders > 0) {
                notifList.push({
                    id: '2',
                    type: 'alert',
                    message: 'Đơn chưa thanh toán',
                    count: unpaidOrders,
                    color: 'orange',
                    icon: DollarSign
                });
            }

            if (paintingJobs > 0) {
                notifList.push({
                    id: '3',
                    type: 'info',
                    message: 'Resin cần sơn',
                    count: paintingJobs,
                    color: 'blue',
                    icon: Package
                });
            }

            if (blockedOrders > 0) {
                notifList.push({
                    id: '4',
                    type: 'alert',
                    message: 'Đơn bị lỗi thanh toán',
                    count: blockedOrders,
                    color: 'red',
                    icon: AlertCircle
                });
            }

            setNotifications(notifList);
        } catch (error) {
            console.error('Failed to load notifications:', error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadNotifications();
        window.addEventListener('admin:data-changed', loadNotifications);
        return () => window.removeEventListener('admin:data-changed', loadNotifications);
    }, []);

    const totalNotifications = notifications.reduce((sum, n) => sum + n.count, 0);

    if (loading) {
        return (
            <div className="dashboard-card notification-widget">
                <h2 className="card-title">Notifications</h2>
                <div className="loading-skeleton">
                    <div className="skeleton-bar" />
                    <div className="skeleton-bar" />
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-card notification-widget">
            <div className="card-header-row">
                <div>
                    <h2 className="card-title">Notifications</h2>
                    <p className="card-subtitle">Cần xử lý</p>
                </div>
                {totalNotifications > 0 && (
                    <div className="notification-count-badge">
                        {totalNotifications}
                    </div>
                )}
            </div>

            <div className="notification-list">
                {notifications.length === 0 ? (
                    <div className="empty-state">
                        <p>Không có thông báo</p>
                    </div>
                ) : (
                    notifications.map((notification) => {
                        const Icon = notification.icon;
                        return (
                            <div key={notification.id} className={`notification-item notification-${notification.color}`}>
                                <div className={`notification-icon notification-icon-${notification.color}`}>
                                    <Icon size={18} />
                                </div>
                                <div className="notification-content">
                                    <p className="notification-message">{notification.message}</p>
                                    <span className={`notification-badge badge-${notification.color}`}>
                                        {notification.count}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
