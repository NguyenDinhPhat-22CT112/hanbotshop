'use client';

import { useEffect, useState } from 'react';
import { adminFetch, getAdminToken } from '../../lib/browser-api';
import { labelOf } from '../../lib/labels';
import { formatDateTime, formatPrice } from '../../lib/format';

type RevenueReport = {
  revenue: string;
  paidOrderCount: number;
  orderCount: number;
  pendingPaymentCount: number;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    total: string;
    createdAt: string;
    user: { email: string; name: string | null };
  }>;
};

export function ReportsPanel() {
  const [report, setReport] = useState<RevenueReport | null>(null);
  const [message, setMessage] = useState('Dang tai bao cao...');

  async function loadReport() {
    if (!getAdminToken()) {
      setMessage('Vui long dang nhap quan tri truoc.');
      return;
    }

    try {
      const payload = await adminFetch<RevenueReport>('/reports/revenue');
      setReport(payload);
      setMessage('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Khong tai duoc bao cao.');
    }
  }

  useEffect(() => {
    void loadReport();
  }, []);

  if (!report) {
    return <p className="admin-message">{message}</p>;
  }

  return (
    <div className="detail-stack">
      <section className="dashboard-grid">
        <article>
          <span>Doanh thu ghi nhan</span>
          <strong>{formatPrice(report.revenue)}</strong>
          <small>Don da thanh toan/toan phan mot phan, khong tinh huy/hoan tien</small>
        </article>
        <article>
          <span>Don thanh toan</span>
          <strong>{report.paidOrderCount}</strong>
          <small>So don co payment status da ghi nhan</small>
        </article>
        <article>
          <span>Tong don</span>
          <strong>{report.orderCount}</strong>
          <small>Tat ca don hang trong he thong</small>
        </article>
        <article>
          <span>Cho thanh toan</span>
          <strong>{report.pendingPaymentCount}</strong>
          <small>Can doi soat qua tin nhan voi khach</small>
        </article>
      </section>

      <section className="table-panel">
        <div className="table-row report-order-row table-head">
          <span>Don hang</span>
          <span>Khach</span>
          <span>Status</span>
          <span>Payment</span>
          <span>Tong tien</span>
          <span>Ngay tao</span>
        </div>
        {report.recentOrders.map((order) => (
          <a className="table-row report-order-row table-link-row" href={`/orders/${order.id}`} key={order.id}>
            <strong>{order.orderNumber}</strong>
            <span>{order.user.name ?? order.user.email}</span>
            <span>{labelOf(order.status)}</span>
            <span>{labelOf(order.paymentStatus)}</span>
            <span>{formatPrice(order.total)}</span>
            <span>{formatDateTime(order.createdAt)}</span>
          </a>
        ))}
      </section>

      {message ? <p className="admin-message">{message}</p> : null}
    </div>
  );
}
