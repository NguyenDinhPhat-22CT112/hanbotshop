'use client';

import { useEffect, useState } from 'react';
import { cancelOrder, getAccountOrder, type AccountOrder } from '../lib/browser-api';
import { PaymentActionButton } from './payment-action-button';

export function AccountOrderDetailClient({ id }: { id: string }) {
  const [order, setOrder] = useState<AccountOrder | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'guest' | 'error'>('loading');
  const [message, setMessage] = useState('');

  function loadOrder() {
    setStatus('loading');
    getAccountOrder(id)
      .then((payload) => {
        setOrder(payload);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }

  useEffect(() => {
    loadOrder();
  }, [id]);

  async function handleCancelOrder() {
    // Hiển thị cảnh báo trước khi hủy
    const confirmed = window.confirm(
      '⚠️ Cảnh báo: Không hoàn tiền\n\n' +
      'Theo chính sách của shop, đơn hàng đã thanh toán sẽ KHÔNG được hoàn tiền khi hủy.\n\n' +
      'Bạn có chắc chắn muốn hủy đơn hàng này không?'
    );

    if (!confirmed) {
      return;
    }

    setMessage('Đang hủy đơn hàng...');

    try {
      const payload = await cancelOrder(id);
      setOrder(payload);
      setMessage('Đơn hàng đã được hủy.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không hủy được đơn hàng.');
    }
  }

  if (status === 'loading') {
    return (
      <main>
        <section className="catalog-header detail-header">
          <p className="eyebrow">Đơn hàng</p>
          <h1>Đang tải...</h1>
        </section>
      </main>
    );
  }

  if (status === 'guest' || status === 'error' || !order) {
    return (
      <main>
        <section className="catalog-header detail-header">
          <p className="eyebrow">Đơn hàng</p>
          <h1>Chưa xem được đơn hàng</h1>
          <p>{status === 'guest' ? 'Bạn cần đăng nhập để xem chi tiết đơn hàng.' : 'Đơn hàng không tồn tại hoặc phiên đăng nhập đã hết hạn.'}</p>
        </section>
      </main>
    );
  }

  return (
    <main>
      <section className="catalog-header detail-header">
        <p className="eyebrow">{order.type === 'RESIN' ? 'ĐƠN RESIN' : 'ĐƠN ORDER'}</p>
        <h1>{order.number}</h1>
        <div className="detail-status-row">
          <span className="status-badge">{order.statusLabel}</span>
          <span className="payment-badge">{order.paymentNotice}</span>
        </div>
      </section>

      <section className="catalog-section detail-layout">
        <div className="detail-main">
          <section className="detail-panel timeline-panel">
            <div className="panel-heading">
              <h2>📦 Tiến Độ Đơn Hàng</h2>
              <span className="estimate-badge">{order.estimate}</span>
            </div>
            <ol className="timeline-list">
              {order.timeline.map((item) => (
                <li className={item.done ? 'is-done' : undefined} key={`${item.title}-${item.time}`}>
                  <strong>{item.title}</strong>
                  <p>{item.note}</p>
                  <span>{item.time}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="detail-panel products-panel">
            <div className="panel-heading">
              <h2>🛍️ Sản Phẩm</h2>
              <span className="total-badge">{order.total}</span>
            </div>
            <div className="line-item-list">
              {order.items.map((item) => (
                <article className="line-item" key={item.name}>
                  <div>
                    <strong>{item.name}</strong>
                    <span>Số lượng: {item.quantity}</span>
                  </div>
                  <b>{item.price}</b>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="detail-side">
          <section className="detail-panel info-panel">
            <h2>📋 Thông Tin Đơn Hàng</h2>
            <dl className="detail-list">
              <div>
                <dt>Ngày Đặt</dt>
                <dd>{order.placedAt}</dd>
              </div>
              <div className="highlight-row">
                <dt>Tổng Tiền</dt>
                <dd>{order.total}</dd>
              </div>
              <div>
                <dt>Cọc Cần Thanh Toán</dt>
                <dd>{order.depositRequired}</dd>
              </div>
              {order.type === 'ORDER' && order.status === 'WAITING_SECOND_PAYMENT' ? (
                <div className="highlight-row">
                  <dt>Thanh Toán Đợt 2</dt>
                  <dd>{order.secondPaymentRequired}</dd>
                </div>
              ) : null}
              <div>
                <dt>Đã Thanh Toán</dt>
                <dd>{order.paidAmount}</dd>
              </div>
              <div className="highlight-row">
                <dt>Còn Lại</dt>
                <dd>{order.remainingAmount}</dd>
              </div>
              {order.type === 'ORDER' && order.status === 'SHIPPING' && order.codAmount !== '0 VND' ? (
                <div className="cod-row">
                  <dt>Thanh Toán Khi Nhận Hàng</dt>
                  <dd>{order.codAmount}</dd>
                </div>
              ) : null}
            </dl>
          </section>

          <section className="detail-panel contact-panel">
            <h2>📞 Thông Tin Liên Hệ</h2>
            <dl className="detail-list">
              <div>
                <dt>Liên Hệ</dt>
                <dd>{order.contact}</dd>
              </div>
              <div>
                <dt>Địa Chỉ Giao Hàng</dt>
                <dd>{order.shippingAddress}</dd>
              </div>
            </dl>
          </section>

          <section className="detail-panel actions-panel">
            {(
              order.type === 'ORDER'
                ? ['WAITING_DEPOSIT', 'WAITING_SECOND_PAYMENT'].includes(order.status)
                : ['PENDING_CONFIRMATION', 'CONFIRMED', 'WAITING_PAYMENT'].includes(order.status)
            ) && order.payment !== 'PAID' ? (
              <PaymentActionButton orderId={order.id} />
            ) : null}
            {(
              order.type === 'ORDER'
                ? order.status === 'WAITING_DEPOSIT'
                : order.status === 'PENDING_CONFIRMATION'
            ) ? (
              <button className="cancel-button" type="button" onClick={() => void handleCancelOrder()}>
                🚫 Hủy Đơn Hàng
              </button>
            ) : null}
            <a className="contact-link" href="mailto:hann34567890@gmail.com">
              ✉️ Liên Hệ Shop
            </a>
            {message ? <p className="form-message">{message}</p> : null}
          </section>
        </aside>
      </section>
    </main>
  );
}
