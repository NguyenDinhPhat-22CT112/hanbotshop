'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { AdminSessionPanel } from './admin-session-panel';
import { shouldShowAdminNavigation } from '../../lib/admin-navigation';

const iconPaths: Record<string, ReactNode> = {
  '/': <><path d="M3 11 12 3l9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/></>,
  '/users': <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
  '/catalog': <><path d="M7 4h10l3 5-8 12L4 9Z"/><path d="M4 9h16M12 4v17"/></>,
  '/categories': <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  '/orders': <><path d="M6 2h12l2 5H4Z"/><path d="M5 7v15h14V7M9 11h6"/></>,
  '/production': <><path d="M14.7 6.3a4 4 0 0 0-5-5L12 3.6 3.6 12 1 19l7-2.6L16.4 8Z"/><path d="m13 5 6 6"/></>,
  '/media': <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></>,
  '/reports': <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
  '/audit-logs': <><path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></>
};

const navItems = [
  ['/', 'Tổng quan'], ['/users', 'Người dùng'], ['/catalog', 'Sản phẩm'],
  ['/categories', 'Danh mục'], ['/orders', 'Đơn hàng'], ['/production', 'Sản xuất'],
  ['/media', 'Thư viện'], ['/reports', 'Báo cáo'], ['/audit-logs', 'Nhật ký hệ thống']
] as const;

export function AdminChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (!shouldShowAdminNavigation(pathname)) return <div className="admin-login-layout">{children}</div>;
  return <div className="admin-app-layout">
    <a className="admin-skip-link" href="#admin-main">Bỏ qua điều hướng</a>
    <aside className="admin-sidebar">
      <Link className="admin-brand" href="/" aria-label="Hanbotorder Admin"><span>Hanbotorder</span><small>Trung tâm quản trị</small></Link>
      <div className="admin-nav-label">Không gian làm việc</div>
      <nav aria-label="Điều hướng quản trị">{navItems.map(([href, label]) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
        return <Link href={href} key={href} aria-current={active ? 'page' : undefined}>
          <svg viewBox="0 0 24 24" aria-hidden="true">{iconPaths[href]}</svg><span>{label}</span>
        </Link>;
      })}</nav>
      <AdminSessionPanel />
    </aside>
    <main id="admin-main" tabIndex={-1}>{children}</main>
  </div>;
}
