'use client';

import { useEffect, useState } from 'react';
import { adminFetch, getAdminToken } from '../lib/browser-api';
import { labelOf } from '../lib/labels';
import { formatAddress, formatDateTime, formatPrice } from './admin-format';

type OrderDetail = {
  id: string;
  orderNumber: string;
  type: 'ORDER' | 'RESIN';
  status: string;
  paymentStatus: string;
  subtotal: string;
  shippingFee: string;
  total: string;
  depositRequired: string;
  secondPaymentRequired: string;
  paidAmount: string;
  remainingAmount: string;
  recipientName?: string | null;
  recipientPhone?: string | null;
  shippingAddress: unknown;
  trackingCarrier?: string | null;
  trackingNumber?: string | null;
  createdAt: string;
  user: { id: string; email: string; name: string | null };
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: string;
    totalPrice: string;
    productSnapshot?: { name?: string; studio?: string | null } | null;
  }>;
  payments: Array<{
    id: string;
    provider: string;
    status: string;
    amount: string;
    providerSessionId?: string | null;
    createdAt: string;
    events?: Array<{ id: string; type: string; providerEventId?: string | null; createdAt: string }>;
  }>;
};

type Note = {
  id: string;
  body: string;
  type: string;
  createdAt: string;
};

type TimelineItem = {
  type: string;
  status?: string;
  note?: string;
  createdAt: string;
};

const orderPurchaseStatuses = [
  'WAITING_DEPOSIT',
  'DEPOSIT_PAID',
  'WAITING_SECOND_PAYMENT',
  'SECOND_PAYMENT_PAID',
  'SHIPPING',
  'COMPLETED',
  'CANCELLED',
  'BLOCKED'
];

const resinStatuses = [
  'PENDING_CONFIRMATION',
  'CONFIRMED',
  'WAITING_PAYMENT',
  'PAID',
  'IN_PRODUCTION',
  'READY_TO_SHIP',
  'SHIPPED',
  'COMPLETED',
  'CANCELLED',
  'BLOCKED'
];

function statusesFor(type: 'ORDER' | 'RESIN') {
  return type === 'ORDER' ? orderPurchaseStatuses : resinStatuses;
}

export function AdminOrderDetail({ id }: { id: string }) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [paymentNotes, setPaymentNotes] = useState<Note[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [message, setMessage] = useState('Đang tải đơn hàng...');

  async function loadOrder() {
    if (!getAdminToken()) {
      setMessage('Vui lòng đăng nhập quản trị trước.');
      return;
    }

    try {
      const [orderPayload, notesPayload, paymentNotesPayload, timelinePayload] = await Promise.all([
        adminFetch<OrderDetail>(`/orders/${encodeURIComponent(id)}`),
        adminFetch<{ data: Note[] }>(`/orders/${encodeURIComponent(id)}/notes`),
        adminFetch<{ data: Note[] }>(`/orders/${encodeURIComponent(id)}/payment-notes`),
        adminFetch<{ data: TimelineItem[] }>(`/orders/${encodeURIComponent(id)}/timeline`)
      ]);

      setOrder(orderPayload);
      setNotes(notesPayload.data.filter((note) => note.type !== 'PAYMENT'));
      setPaymentNotes(paymentNotesPayload.data);
      setTimeline(timelinePayload.data);
      setMessage('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không tải được đơn hàng.');
    }
  }

  useEffect(() => {
    void loadOrder();
  }, [id]);

  async function updateOrder(formData: FormData) {
    const status = String(formData.get('status') ?? '');
    const trackingCarrier = String(formData.get('trackingCarrier') ?? '').trim();
    const trackingNumber = String(formData.get('trackingNumber') ?? '').trim();
    setMessage('Đang cập nhật đơn hàng...');

    try {
      if (status) {
        await adminFetch(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      }

      if (trackingCarrier || trackingNumber) {
        await adminFetch(`/orders/${id}/tracking`, {
          method: 'PATCH',
          body: JSON.stringify({ trackingCarrier, trackingNumber })
        });
      }

      await loadOrder();
      setMessage('Đã cập nhật đơn hàng.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không cập nhật được đơn hàng.');
    }
  }

  async function requestSecondPayment(formData: FormData) {
    const amount = Number(formData.get('amount') ?? 0);
    setMessage('Đang tạo yêu cầu thanh toán đợt 2...');

    try {
      await adminFetch(`/orders/${id}/second-payment`, {
        method: 'PATCH',
        body: JSON.stringify({ amount })
      });
      await loadOrder();
      setMessage('Đã chuyển đơn sang chờ thanh toán đợt 2.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không tạo được yêu cầu thanh toán đợt 2.');
    }
  }

  async function recordCodPayment(formData: FormData) {
    const amount = Number(formData.get('amount') ?? 0);
    const note = String(formData.get('note') ?? '').trim();
    setMessage('Đang ghi nhận tiền thu khi giao hàng...');

    try {
      await adminFetch('/payments/manual-receipt', {
        method: 'POST',
        body: JSON.stringify({ orderId: id, amount, note })
      });
      await loadOrder();
      setMessage('Đã ghi nhận khoản tiền thu khi giao hàng.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không ghi nhận được khoản tiền COD.');
    }
  }

  async function addNote(formData: FormData, type: 'GENERAL' | 'PAYMENT') {
    const body = String(formData.get('body') ?? '').trim();

    if (!body) {
      return;
    }

    setMessage('Đang thêm ghi chú...');

    try {
      await adminFetch(type === 'PAYMENT' ? `/orders/${id}/payment-notes` : `/orders/${id}/notes`, {
        method: 'POST',
        body: JSON.stringify(type === 'PAYMENT' ? { body } : { type, body })
      });
      await loadOrder();
      setMessage('Đã thêm ghi chú.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thêm được ghi chú.');
    }
  }

  async function cancelOrder() {
    setMessage('Đang hủy đơn hàng...');

    try {
      await adminFetch(`/orders/${id}/cancel`, { method: 'POST' });
      await loadOrder();
      setMessage('Đã hủy đơn hàng.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không hủy được đơn hàng.');
    }
  }

  async function confirmManualTransfer(paymentId: string) {
    setMessage('Đang xác nhận chuyển khoản...');

    try {
      await adminFetch(`/payments/${encodeURIComponent(paymentId)}/confirm-manual`, { method: 'POST' });
      await loadOrder();
      setMessage('Đã xác nhận nhận tiền và cập nhật đơn hàng.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không xác nhận được chuyển khoản.');
    }
  }

  if (!order) {
    return <p className="admin-message">{message}</p>;
  }

  return (
    <div className="detail-stack">
      <section className="admin-panel detail-grid">
        <div>
          <h2>Thông Tin Đơn Hàng</h2>
          <dl className="detail-list">
            <div>
              <dt>Khách Hàng</dt>
              <dd>
                <a href={`/users/${order.user.id}`}>{order.user.name ?? order.user.email}</a>
              </dd>
            </div>
            <div>
              <dt>Loại Đơn</dt>
              <dd>{order.type === 'RESIN' ? 'Đơn Resin' : 'Đơn Order'}</dd>
            </div>
            <div>
              <dt>Liên Hệ</dt>
              <dd>{[order.recipientName, order.recipientPhone].filter(Boolean).join(' / ') || '-'}</dd>
            </div>
            <div>
              <dt>Địa Chỉ</dt>
              <dd>{formatAddress(order.shippingAddress)}</dd>
            </div>
            <div>
              <dt>Ngày Tạo</dt>
              <dd>{formatDateTime(order.createdAt)}</dd>
            </div>
          </dl>
        </div>
        <div>
          <h2>Tổng Tiền</h2>
          <dl className="detail-list">
            <div>
              <dt>Tạm Tính</dt>
              <dd>{formatPrice(order.subtotal)}</dd>
            </div>
            <div>
              <dt>Phí Giao Hàng</dt>
              <dd>{formatPrice(order.shippingFee)}</dd>
            </div>
            <div>
              <dt>Tổng</dt>
              <dd>{formatPrice(order.total)}</dd>
            </div>
            <div>
              <dt>Cọc Cần Thu</dt>
              <dd>{formatPrice(order.depositRequired)}</dd>
            </div>
            {order.type === 'ORDER' ? (
              <div>
                <dt>Yêu Cầu Đợt 2</dt>
                <dd>{formatPrice(order.secondPaymentRequired)}</dd>
              </div>
            ) : null}
            <div>
              <dt>Đã Thu</dt>
              <dd>{formatPrice(order.paidAmount)}</dd>
            </div>
            <div>
              <dt>Còn Thiếu</dt>
              <dd>{formatPrice(order.remainingAmount)}</dd>
            </div>
            <div>
              <dt>Tracking</dt>
              <dd>{[order.trackingCarrier, order.trackingNumber].filter(Boolean).join(' / ') || '-'}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="admin-panel">
        <h2>Cập Nhật Vận Hành</h2>
        <form className="admin-form compact-form" action={updateOrder}>
          <label>
            Trạng Thái
            <select name="status" defaultValue={order.status}>
              {statusesFor(order.type).map((status) => (
                <option value={status} key={status}>
                  {labelOf(status)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Đơn Vị Vận Chuyển
            <input name="trackingCarrier" defaultValue={order.trackingCarrier ?? ''} />
          </label>
          <label>
            Mã Tracking
            <input name="trackingNumber" defaultValue={order.trackingNumber ?? ''} />
          </label>
          <div className="row-actions wide-field">
            <button type="submit">Lưu Cập Nhật</button>
            <button className="danger-button" type="button" onClick={() => void cancelOrder()}>
              Hủy Đơn
            </button>
          </div>
        </form>
      </section>

      {order.type === 'ORDER' && order.status === 'DEPOSIT_PAID' ? (
        <section className="admin-panel">
          <h2>Yêu Cầu Thanh Toán Đợt 2</h2>
          <p>
            Còn lại {formatPrice(order.remainingAmount)}. Admin nhập số tiền cần thu trong đợt 2;
            phần còn lại sẽ được tính là COD khi giao hàng.
          </p>
          <form className="admin-form compact-form" action={requestSecondPayment}>
            <label>
              Số Tiền Đợt 2
              <input
                name="amount"
                type="number"
                min="1"
                max={order.remainingAmount}
                defaultValue={Math.round(Number(order.remainingAmount) * 0.8)}
                required
              />
            </label>
            <button type="submit">Gửi Yêu Cầu Thanh Toán Đợt 2</button>
          </form>
        </section>
      ) : null}

      {order.type === 'ORDER' && order.status === 'SHIPPING' && Number(order.remainingAmount) > 0 ? (
        <section className="admin-panel">
          <h2>Ghi Nhận Tiền COD</h2>
          <p>Khách còn thiếu {formatPrice(order.remainingAmount)} khi nhận hàng.</p>
          <form className="admin-form compact-form" action={recordCodPayment}>
            <label>
              Số Tiền Đã Thu
              <input name="amount" type="number" min="1" max={order.remainingAmount} defaultValue={order.remainingAmount} required />
            </label>
            <label>
              Ghi Chú
              <input name="note" defaultValue="Shipper đã thu tiền còn lại." />
            </label>
            <button type="submit">Xác Nhận Đã Thu COD</button>
          </form>
        </section>
      ) : null}

      <section className="table-panel">
        <div className="table-row detail-item-row table-head">
          <span>Sản Phẩm</span>
          <span>Số Lượng</span>
          <span>Đơn Giá</span>
          <span>Thành Tiền</span>
        </div>
        {order.items.map((item) => (
          <div className="table-row detail-item-row" key={item.id}>
            <strong>
              {item.productSnapshot?.name ?? 'Sản phẩm'}
              <small>{item.productSnapshot?.studio ?? '-'}</small>
            </strong>
            <span>{item.quantity}</span>
            <span>{formatPrice(item.unitPrice)}</span>
            <span>{formatPrice(item.totalPrice)}</span>
          </div>
        ))}
      </section>

      <section className="detail-two-column">
        <NotesPanel title="Ghi Chú Nội Bộ" notes={notes} onSubmit={(formData) => addNote(formData, 'GENERAL')} />
        <NotesPanel title="Ghi Chú Thanh Toán" notes={paymentNotes} onSubmit={(formData) => addNote(formData, 'PAYMENT')} />
      </section>

      <section className="detail-two-column">
        <TimelinePanel items={timeline} />
        <PaymentPanel payments={order.payments} onConfirm={confirmManualTransfer} />
      </section>

      {message ? <p className="admin-message">{message}</p> : null}
    </div>
  );
}

function NotesPanel({
  title,
  notes,
  onSubmit
}: {
  title: string;
  notes: Note[];
  onSubmit: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <section className="admin-panel">
      <h2>{title}</h2>
      <form className="admin-form" action={onSubmit}>
        <label>
          Nội Dung
          <textarea name="body" required />
        </label>
        <button type="submit">Thêm Ghi Chú</button>
      </form>
      <div className="detail-list-block">
        {notes.length === 0 ? (
          <p className="empty-state">Chưa có ghi chú nào.</p>
        ) : (
          notes.map((note) => (
            <article key={note.id}>
              <strong>{formatDateTime(note.createdAt)}</strong>
              <p>{note.body}</p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function TimelinePanel({ items }: { items: TimelineItem[] }) {
  // Lọc và format timeline items tương tự như customer view
  const formattedItems = items.map((item) => {
    const payload = typeof item === 'object' && 'payload' in item && item.payload && typeof item.payload === 'object'
      ? item.payload as Record<string, unknown>
      : {};

    // Lấy status mới nếu có
    const displayStatus = (typeof payload.after === 'string' ? payload.after : item.status) ?? item.type;
    const displayLabel = labelOf(displayStatus);

    // Tạo note chi tiết hơn
    let note = '';
    if (item.type === 'STATUS_CHANGED' && typeof payload.before === 'string' && typeof payload.after === 'string') {
      note = `Chuyển từ ${labelOf(payload.before)} → ${labelOf(payload.after)}`;
    } else if (item.type === 'PAYMENT_STATUS_CHANGED' && typeof payload.before === 'string' && typeof payload.after === 'string') {
      note = `Thanh toán: ${labelOf(payload.before)} → ${labelOf(payload.after)}`;
      if (typeof payload.paidAmount === 'string') {
        note += ` · Đã thu: ${formatPrice(payload.paidAmount)}`;
      }
    } else if (item.type === 'ORDER_CREATED') {
      note = 'Đơn hàng được tạo bởi khách hàng';
    } else if (item.type === 'CHECKOUT_CREATED') {
      note = 'Session thanh toán được tạo';
    } else if (item.type === 'PAYMENT_CONFIRMED') {
      note = 'Thanh toán được xác nhận';
    } else if (item.note) {
      note = item.note;
    }

    return {
      label: displayLabel,
      note,
      time: formatDateTime(item.createdAt),
      type: item.type
    };
  });

  return (
    <section className="admin-panel">
      <h2>📋 Timeline & Events</h2>
      <div className="detail-list-block timeline-block">
        {formattedItems.length === 0 ? (
          <p className="empty-state">Chưa có sự kiện nào.</p>
        ) : (
          formattedItems.map((item, index) => (
            <article key={`${item.type}-${item.time}-${index}`} className="timeline-item">
              <div className="timeline-header">
                <strong>{item.label}</strong>
                <small>{item.time}</small>
              </div>
              {item.note ? <p className="timeline-note">{item.note}</p> : null}
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function PaymentPanel({
  payments,
  onConfirm
}: {
  payments: OrderDetail['payments'];
  onConfirm: (paymentId: string) => void | Promise<void>;
}) {
  return (
    <section className="admin-panel">
      <h2>💳 Thanh Toán</h2>
      <div className="detail-list-block">
        {payments.length === 0 ? (
          <p className="empty-state">Chưa có giao dịch thanh toán.</p>
        ) : (
          payments.map((payment) => (
            <article key={payment.id} className="payment-item">
              <div className="payment-header">
                <strong>
                  {payment.provider === 'manual_bank_transfer' ? '🏦 Chuyển Khoản' : payment.provider}
                  {' · '}
                  <span className={`payment-status status-${payment.status.toLowerCase()}`}>
                    {labelOf(payment.status)}
                  </span>
                </strong>
                <small>{formatDateTime(payment.createdAt)}</small>
              </div>
              <p className="payment-amount">{formatPrice(payment.amount)}</p>
              {payment.providerSessionId ? <p className="payment-ref">Ref: {payment.providerSessionId}</p> : null}
              {payment.provider === 'manual_bank_transfer' && payment.status === 'UNPAID' ? (
                <button type="button" className="confirm-payment-btn" onClick={() => void onConfirm(payment.id)}>
                  ✅ Xác Nhận Đã Nhận Chuyển Khoản
                </button>
              ) : null}
            </article>
          ))
        )}
      </div>
    </section>
  );
}
