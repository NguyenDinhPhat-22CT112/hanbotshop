'use client';

import { Bell, Search, User } from 'lucide-react';

export function DashboardHeader() {
    return (
        <header className="dashboard-header">
            <div className="dashboard-welcome">
                <h1 className="dashboard-title">
                    Xin chào Admin <span className="wave">👋</span>
                </h1>
                <p className="dashboard-subtitle">
                    Chào mừng quay trở lại Hanbotorder
                </p>
            </div>

            <div className="dashboard-header-actions">
                <button className="header-icon-button" aria-label="Tìm kiếm">
                    <Search size={20} />
                </button>

                <button className="header-icon-button has-badge" aria-label="Thông báo">
                    <Bell size={20} />
                    <span className="notification-badge">5</span>
                </button>

                <button className="header-user-button" aria-label="Tài khoản">
                    <div className="user-avatar-small">
                        <User size={16} />
                    </div>
                    <span>Admin</span>
                </button>
            </div>
        </header>
    );
}
