'use client';

import { useEffect, useState } from 'react';
import { clearToken, getAccountOrders, getCurrentUser, type AccountOrder, type AuthUser } from '../lib/browser-api';

function displayName(user: AuthUser | null) {
  return user?.name?.trim() || user?.email?.split('@')[0] || 'Khách hàng Hanbotorder';
}

function logout() {
  clearToken();
  window.location.href = '/';
}

export function AccountOverviewClient() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [orders, setOrders] = useState<AccountOrder[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'guest' | 'error'>('loading');

  useEffect(() => {
    Promise.all([getCurrentUser(), getAccountOrders()])
      .then(([userPayload, orderPayload]) => {
        setUser(userPayload.user);
        setOrders(orderPayload);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, []);

  const name = displayName(user);
  const latestOrder = orders[0];

  return (
    <main className="account-home-page">
      <header className="account-home-heading">
        <h1>Tài khoản của bạn</h1>
      </header>

      <section className="account-home-layout">
        <aside className="account-side-nav" aria-label="Tài khoản">
          <h2>TÀI KHOẢN</h2>
          <a href="/account" aria-current="page">
            Thông tin tài khoản
          </a>
          <a href="/account/addresses">Danh sách địa chỉ</a>
          <button type="button" onClick={logout}>
            Đăng xuất
          </button>
        </aside>

        <div className="account-home-content">
          {status === 'guest' ? (
            <article className="account-notice">
              <strong>Bạn cần đăng nhập</strong>
              <span>Đăng nhập bằng nút tài khoản phía trên để xem thông tin cá nhân và đơn hàng.</span>
            </article>
          ) : null}

          {status === 'error' ? (
            <article className="account-notice">
              <strong>Chưa tải được thông tin tài khoản</strong>
              <span>Phiên đăng nhập có thể đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.</span>
            </article>
          ) : null}

          <section className="account-info-panel">
            <h2>THÔNG TIN TÀI KHOẢN</h2>
            <div className="account-info-divider" />
            <strong>{status === 'loading' ? 'Đang tải...' : name}</strong>
            <span>{user?.email ?? 'Email sẽ hiển thị sau khi đăng nhập'}</span>
            <span>Số điện thoại: {user?.phone || 'Chưa cập nhật'}</span>
            <span>Vietnam</span>
            <div className="account-info-actions">
              <a href="/account/addresses">Xem địa chỉ</a>
              <a href="/account/profile">Chỉnh sửa hồ sơ</a>
            </div>
          </section>

          <section className="account-order-summary">
            {status === 'loading' ? (
              <span>Đang tải đơn hàng...</span>
            ) : latestOrder ? (
              <>
                <strong>Đơn gần nhất: {latestOrder.number}</strong>
                <span>
                  {latestOrder.statusLabel} · {latestOrder.total}
                </span>
                <a href={`/account/orders/${encodeURIComponent(latestOrder.id)}`}>Xem chi tiết đơn hàng</a>
              </>
            ) : (
              <span>Bạn chưa đặt mua sản phẩm.</span>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
