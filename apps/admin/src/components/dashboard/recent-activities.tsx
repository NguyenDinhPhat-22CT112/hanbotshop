'use client';

import { Clock, CheckCircle2, AlertCircle, DollarSign, Package, ShoppingCart } from 'lucide-react';
import { useEffect, useState } from 'react';
import { adminFetch, getAdminToken } from '../../lib/browser-api';

type AuditLog = {
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    details?: string;
    createdAt: string;
    userId?: string;
};

type Activity = {
    id: string;
    type: 'order' | 'payment' | 'production' | 'alert';
    message: string;
    time: string;
    icon: typeof CheckCircle2;
    color: string;
};

export function RecentActivities() {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);

    async function loadActivities() {
        if (!getAdminToken()) {
            setLoading(false);
            return;
        }

        try {
            // Try to get audit logs, fallback to orders if not available
            try {
                const response = await adminFetch<{ data: AuditLog[] }>('/audit-logs?pageSize=10&sort=-createdAt');
                const logs = response.data.slice(0, 5);

                const activityList: Activity[] = logs.map((log) => {
                    return parseAuditLog(log);
                });

                setActivities(activityList);
            } catch (auditError) {
                // Fallback to orders if audit logs not available
                const ordersResponse = await adminFetch<{ data: any[] }>('/orders?pageSize=5&sort=-createdAt');
                const orders = ordersResponse.data;

                const activityList: Activity[] = orders.map((order, index) => {
                    return {
                        id: String(index),
                        type: 'order',
                        message: `Đơn hàng ${order.orderNumber || order.id} được tạo`,
                        time: formatTime(order.createdAt),
                        icon: ShoppingCart,
                        color: 'blue'
                    };
                });

                setActivities(activityList);
            }
        } catch (error) {
            console.error('Failed to load activities:', error);
        } finally {
            setLoading(false);
        }
    }

    function parseAuditLog(log: AuditLog): Activity {
        const action = log.action.toLowerCase();
        const entityType = log.entityType?.toLowerCase() || '';

        if (action.includes('create')) {
            if (entityType.includes('order')) {
                return {
                    id: log.id,
                    type: 'order',
                    message: `Tạo đơn hàng #${log.entityId.substring(0, 8)}`,
                    time: formatTime(log.createdAt),
                    icon: ShoppingCart,
                    color: 'blue'
                };
            } else if (entityType.includes('production') || entityType.includes('job')) {
                return {
                    id: log.id,
                    type: 'production',
                    message: `Tạo production job #${log.entityId.substring(0, 8)}`,
                    time: formatTime(log.createdAt),
                    icon: Package,
                    color: 'purple'
                };
            }
        }

        if (action.includes('update')) {
            if (action.includes('confirm')) {
                return {
                    id: log.id,
                    type: 'order',
                    message: `Xác nhận đơn hàng #${log.entityId.substring(0, 8)}`,
                    time: formatTime(log.createdAt),
                    icon: CheckCircle2,
                    color: 'green'
                };
            } else if (action.includes('payment') || action.includes('paid')) {
                return {
                    id: log.id,
                    type: 'payment',
                    message: `Thanh toán cho đơn #${log.entityId.substring(0, 8)}`,
                    time: formatTime(log.createdAt),
                    icon: DollarSign,
                    color: 'green'
                };
            } else if (action.includes('block') || action.includes('cancel')) {
                return {
                    id: log.id,
                    type: 'alert',
                    message: `Đơn #${log.entityId.substring(0, 8)} có vấn đề`,
                    time: formatTime(log.createdAt),
                    icon: AlertCircle,
                    color: 'red'
                };
            }
        }

        // Default activity
        return {
            id: log.id,
            type: 'order',
            message: `${log.action} - ${entityType}`,
            time: formatTime(log.createdAt),
            icon: CheckCircle2,
            color: 'blue'
        };
    }

    function formatTime(dateStr: string): string {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Vừa xong';
        if (diffMins < 60) return `${diffMins} phút trước`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)} giờ trước`;
        return `${Math.floor(diffMins / 1440)} ngày trước`;
    }

    useEffect(() => {
        void loadActivities();
        window.addEventListener('admin:data-changed', loadActivities);
        return () => window.removeEventListener('admin:data-changed', loadActivities);
    }, []);

    if (loading) {
        return (
            <div className="dashboard-card">
                <h2 className="card-title">Recent Activities</h2>
                <div className="loading-skeleton">
                    <div className="skeleton-bar" />
                    <div className="skeleton-bar" />
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-card">
            <h2 className="card-title">Recent Activities</h2>
            <p className="card-subtitle">Hoạt động gần đây</p>

            <div className="activity-timeline">
                {activities.length === 0 ? (
                    <div className="empty-state">
                        <p>Chưa có hoạt động</p>
                    </div>
                ) : (
                    activities.map((activity, index) => {
                        const Icon = activity.icon;
                        return (
                            <div key={activity.id} className="activity-item">
                                <div className="activity-timeline-line">
                                    <div className={`activity-icon activity-icon-${activity.color}`}>
                                        <Icon size={14} />
                                    </div>
                                    {index < activities.length - 1 && <div className="timeline-connector" />}
                                </div>

                                <div className="activity-content">
                                    <p className="activity-message">{activity.message}</p>
                                    <div className="activity-time">
                                        <Clock size={12} />
                                        <span>{activity.time}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
