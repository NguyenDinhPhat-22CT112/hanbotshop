'use client';

import { Clock, CheckCircle2, AlertCircle, DollarSign, Package } from 'lucide-react';

type Activity = {
    id: string;
    type: 'order' | 'payment' | 'production' | 'alert';
    message: string;
    time: string;
    icon: typeof CheckCircle2;
    color: string;
};

export function RecentActivities() {
    // Mock data - replace with real API call
    const activities: Activity[] = [
        {
            id: '1',
            type: 'order',
            message: 'Nguyễn Văn A đã tạo đơn hàng #HB-2024-001',
            time: '5 phút trước',
            icon: Package,
            color: 'blue'
        },
        {
            id: '2',
            type: 'order',
            message: 'Đã xác nhận đơn hàng #HB-2024-002',
            time: '10 phút trước',
            icon: CheckCircle2,
            color: 'green'
        },
        {
            id: '3',
            type: 'payment',
            message: 'Đã nhận thanh toán cọc 50% cho đơn #HB-2024-003',
            time: '30 phút trước',
            icon: DollarSign,
            color: 'green'
        },
        {
            id: '4',
            type: 'alert',
            message: 'Đơn #HB-2024-004 có vấn đề thanh toán',
            time: '1 giờ trước',
            icon: AlertCircle,
            color: 'red'
        },
        {
            id: '5',
            type: 'production',
            message: 'Hoàn thành sơn cho Resin Job #RJ-123',
            time: '2 giờ trước',
            icon: CheckCircle2,
            color: 'purple'
        }
    ];

    return (
        <div className="dashboard-card">
            <h2 className="card-title">Recent Activities</h2>
            <p className="card-subtitle">Hoạt động gần đây</p>

            <div className="activity-timeline">
                {activities.map((activity, index) => {
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
                })}
            </div>
        </div>
    );
}
