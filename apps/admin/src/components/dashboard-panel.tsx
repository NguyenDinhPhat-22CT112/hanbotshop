'use client';

import { useEffect, useState } from 'react';
import { adminFetch, getAdminToken } from '../lib/browser-api';

type ListResponse = {
  data: unknown[];
  meta?: {
    total: number;
  };
};

type DashboardItem = {
  label: string;
  value: string;
  copy: string;
};

export function DashboardPanel() {
  const [items, setItems] = useState<DashboardItem[]>([]);
  const [message, setMessage] = useState('Đang tải số liệu quản trị...');

  async function loadDashboard() {
    if (!getAdminToken()) {
      setItems([]);
      setMessage('Đăng nhập quản trị để xem số liệu thật.');
      return;
    }

    try {
      const [products, orders, users, jobs] = await Promise.all([
        adminFetch<ListResponse>('/admin/products?pageSize=1'),
        adminFetch<ListResponse>('/orders?pageSize=1'),
        adminFetch<ListResponse>('/users?pageSize=1'),
        adminFetch<ListResponse>('/production-jobs?pageSize=1')
      ]);

      setItems([
        { label: 'Sản phẩm', value: String(products.meta?.total ?? products.data.length), copy: 'Đang quản lý trong catalog' },
        { label: 'Đơn hàng', value: String(orders.meta?.total ?? orders.data.length), copy: 'Cần theo dõi xác nhận và thanh toán' },
        { label: 'Người dùng', value: String(users.meta?.total ?? users.data.length), copy: 'Khách hàng và tài khoản quản trị' },
        { label: 'Sản xuất', value: String(jobs.meta?.total ?? jobs.data.length), copy: 'Job resin print và xử lý hậu kỳ' }
      ]);
      setMessage('');
    } catch (error) {
      setItems([]);
      setMessage(error instanceof Error ? error.message : 'Không tải được số liệu quản trị.');
    }
  }

  useEffect(() => {
    void loadDashboard();
    window.addEventListener('admin:data-changed', loadDashboard);

    return () => window.removeEventListener('admin:data-changed', loadDashboard);
  }, []);

  return (
    <>
      {items.length ? (
        <section className="dashboard-grid">
          {items.map((item) => (
            <article key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.copy}</small>
            </article>
          ))}
        </section>
      ) : null}
      {message ? <p className="admin-message">{message}</p> : null}
    </>
  );
}
