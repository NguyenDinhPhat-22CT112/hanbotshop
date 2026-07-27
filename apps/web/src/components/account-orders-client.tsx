'use client';

import { useEffect, useState } from 'react';
import { getAccountOrders, type AccountOrder } from '../lib/browser-api';

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

  const orderPurchases = orders.filter((order) => order.type === 'ORDER');
  const resinOrders = orders.filter((order) => order.type === 'RESIN');

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

        <OrderGroup title="Đơn Order" orders={orderPurchases} />
        <OrderGroup title="Đơn Resin" orders={resinOrders} />
      </section>
    </main>
  );
}

function OrderGroup({ title, orders }: { title: string; orders: AccountOrder[] }) {
  return (
    <section className="account-order-group">
      <h2>{title}</h2>
      {orders.length ? (
        <div className="order-list">
          {orders.map((order) => (
            <a className="order-card" href={`/account/orders/${encodeURIComponent(order.id)}`} key={order.id}>
              <strong>{order.number}</strong>
              <span>{order.statusLabel}</span>
              <span>{order.paymentNotice}</span>
              <span>{order.total}</span>
            </a>
          ))}
        </div>
      ) : (
        <p>Chưa có {title.toLowerCase()}.</p>
      )}
    </section>
  );
}
