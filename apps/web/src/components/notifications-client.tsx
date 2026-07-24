'use client';

import { useEffect, useState } from 'react';
import { getNotifications, markNotificationRead, type AccountNotification } from '../lib/browser-api';

export function NotificationsClient() {
  const [items, setItems] = useState<AccountNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [message, setMessage] = useState('Đang tải thông báo...');

  useEffect(() => {
    getNotifications()
      .then((result) => { setItems(result.data); setUnreadCount(result.unreadCount); setMessage(''); })
      .catch((error) => setMessage(error instanceof Error ? error.message : 'Không tải được thông báo.'));
  }, []);

  async function markRead(item: AccountNotification) {
    if (item.readAt) return;
    await markNotificationRead(item.id);
    setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry));
    setUnreadCount((count) => Math.max(0, count - 1));
  }

  return (
    <main className="account-home-page">
      <header className="account-home-heading"><h1>Thông báo</h1><p>{unreadCount} thông báo chưa đọc</p></header>
      {message ? <p className="form-message">{message}</p> : null}
      <section className="notification-list">
        {items.map((item) => (
          <article className={item.readAt ? 'notification-card' : 'notification-card notification-card--unread'} key={item.id}>
            <div><strong>{item.title}</strong><small>{new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(item.createdAt))}</small></div>
            <p>{item.body}</p>
            <div className="row-actions">
              {item.data?.orderId ? <a href={`/account/orders/${encodeURIComponent(item.data.orderId)}`}>Xem đơn hàng</a> : null}
              {!item.readAt ? <button type="button" onClick={() => void markRead(item)}>Đánh dấu đã đọc</button> : null}
            </div>
          </article>
        ))}
        {!message && !items.length ? <p>Chưa có thông báo.</p> : null}
      </section>
    </main>
  );
}
