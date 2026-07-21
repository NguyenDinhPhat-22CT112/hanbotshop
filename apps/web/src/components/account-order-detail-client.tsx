'use client';

import { useEffect, useState } from 'react';
import { cancelOrder, getAccountOrder, type AccountOrder } from '../lib/browser-api';
import { labelOf } from '../lib/labels';
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
        <p className="eyebrow">Đơn hàng</p>
        <h1>{order.number}</h1>
        <div className="detail-status-row">
          <span>{labelOf(order.status)}</span>
          <span>{labelOf(order.payment)}</span>
        </div>
      </section>

      <section className="catalog-section detail-layout">
        <div className="detail-main">
          <section className="detail-panel">
            <div className="panel-heading">
              <h2>Tiến độ</h2>
              <span>{order.estimate}</span>
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

          <section className="detail-panel">
            <div className="panel-heading">
              <h2>Sản phẩm</h2>
              <span>{order.total}</span>
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
          <section className="detail-panel">
            <h2>Thông tin đơn</h2>
            <dl className="detail-list">
              <div>
                <dt>Ngày đặt</dt>
                <dd>{order.placedAt}</dd>
              </div>
              <div>
                <dt>Tổng tiền</dt>
                <dd>{order.total}</dd>
              </div>
              <div>
                <dt>Cọc cần thanh toán</dt>
                <dd>{order.depositRequired}</dd>
              </div>
              <div>
                <dt>Đã thanh toán</dt>
                <dd>{order.paidAmount}</dd>
              </div>
              <div>
                <dt>Còn lại</dt>
                <dd>{order.remainingAmount}</dd>
              </div>
              <div>
                <dt>Liên hệ</dt>
                <dd>{order.contact}</dd>
              </div>
              <div>
                <dt>Địa chỉ</dt>
                <dd>{order.shippingAddress}</dd>
              </div>
            </dl>
            {order.payment === 'UNPAID' || order.payment === 'PARTIALLY_PAID' ? <PaymentActionButton orderId={order.id} /> : null}
            {['PENDING_CONFIRMATION', 'CONFIRMED', 'WAITING_PAYMENT'].includes(order.status) ? (
              <button className="primary-link" type="button" onClick={() => void handleCancelOrder()}>
                Hủy đơn hàng
              </button>
            ) : null}
            {message ? <p className="form-message">{message}</p> : null}
            <a className="primary-link" href="mailto:thaomihi@gmail.com">
              Gửi cập nhật cho shop
            </a>
          </section>
        </aside>
      </section>
    </main>
  );
}
