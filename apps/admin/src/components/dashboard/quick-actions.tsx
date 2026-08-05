'use client';

import { Plus, ShoppingCart, UserPlus, Factory, Package, BarChart3 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function QuickActions() {
    const router = useRouter();

    const actions = [
        {
            label: 'Thêm sản phẩm',
            icon: Plus,
            href: '/catalog/new',
            color: 'primary'
        },
        {
            label: 'Tạo đơn hàng',
            icon: ShoppingCart,
            href: '/orders/new',
            color: 'secondary'
        },
        {
            label: 'Thêm khách hàng',
            icon: UserPlus,
            href: '/users/new',
            color: 'secondary'
        },
        {
            label: 'Tạo Resin Job',
            icon: Factory,
            href: '/production/new',
            color: 'secondary'
        },
        {
            label: 'Quản lý kho',
            icon: Package,
            href: '/inventory',
            color: 'secondary'
        },
        {
            label: 'Xem báo cáo',
            icon: BarChart3,
            href: '/reports',
            color: 'secondary'
        }
    ];

    return (
        <div className="dashboard-card">
            <h2 className="card-title">Quick Actions</h2>
            <div className="quick-actions-grid">
                {actions.map((action) => {
                    const Icon = action.icon;
                    return (
                        <button
                            key={action.label}
                            onClick={() => router.push(action.href)}
                            className={`quick-action-button quick-action-${action.color}`}
                        >
                            <Icon size={20} strokeWidth={2} />
                            <span>{action.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
