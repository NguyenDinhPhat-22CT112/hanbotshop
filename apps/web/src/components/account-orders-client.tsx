'use client';

import { useEffect, useState } from 'react';
import { getAccountOrders, type AccountOrder } from '../lib/browser-api';
import { labelOf } from '../lib/labels';

export function AccountOrdersClient() {
  const [orders, setOrders] = useState<AccountOrder[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'guest' | 'error'>('loading');

  useEffect(() => {
    getAccountOrders()
      .then((payload) => {
        setOrders(payload);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, []);

  return (
    <main>
      <section className="catalog-header">
        <p className="eyebrow">Tài khoản</p>
        <h1>Đơn hàng</h1>
      </section>

      <section className="catalog-section">
        {status === 'loading' ? <p>Đang tải đơn hàng...</p> : null}
        {status === 'guest' ? <p>Bạn cần đăng nhập để xem đơn hàng thật.</p> : null}
        {status === 'error' ? <p>Chưa tải được đơn hàng. Vui lòng đăng nhập lại hoặc thử lại sau.</p> : null}
        {status === 'ready' && !orders.length ? <p>Bạn chưa có đơn hàng nào.</p> : null}

        <div className="order-list">
          {orders.map((order) => (
            <a className="order-card" href={`/account/orders/${encodeURIComponent(order.id)}`} key={order.id}>
              <strong>{order.number}</strong>
              <span>{labelOf(order.status)}</span>
              <span>{labelOf(order.payment)}</span>
              <span>{order.total}</span>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
