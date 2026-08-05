'use client';

import { AlertCircle, Clock, DollarSign, Package } from 'lucide-react';

type Notification = {
    id: string;
    type: 'alert' | 'warning' | 'info';
    message: string;
    count?: number;
    color: string;
    icon: typeof AlertCircle;
};

export function NotificationsWidget() {
    // Mock data - replace with real API
    const notifications: Notification[] = [
        {
            id: '1',
            type: 'warning',
            message: 'Đơn cần xác nhận',
            count: 5,
            color: 'yellow',
            icon: Clock
        },
        {
            id: '2',
            type: 'alert',
            message: 'Đơn chưa thanh toán',
            count: 3,
            color: 'orange',
            icon: DollarSign
        },
        {
            id: '3',
            type: 'info',
            message: 'Resin cần sơn',
            count: 8,
            color: 'blue',
            icon: Package
        },
        {
            id: '4',
            type: 'alert',
            message: 'Đơn bị lỗi thanh toán',
            count: 2,
            color: 'red',
            icon: AlertCircle
        }
    ];

    const totalNotifications = notifications.reduce((sum, n) => sum + (n.count || 0), 0);

    return (
        <div className="dashboard-card notification-widget">
            <div className="card-header-row">
                <div>
                    <h2 className="card-title">Notifications</h2>
                    <p className="card-subtitle">Cần xử lý</p>
                </div>
                <div className="notification-count-badge">
                    {totalNotifications}
                </div>
            </div>

            <div className="notification-list">
                {notifications.map((notification) => {
                    const Icon = notification.icon;
                    return (
                        <div key={notification.id} className={`notification-item notification-${notification.color}`}>
                            <div className={`notification-icon notification-icon-${notification.color}`}>
                                <Icon size={18} />
                            </div>
                            <div className="notification-content">
                                <p className="notification-message">{notification.message}</p>
                                {notification.count && (
                                    <span className={`notification-badge badge-${notification.color}`}>
                                        {notification.count}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
