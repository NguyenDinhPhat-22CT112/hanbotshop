'use client';

import { useEffect, useState } from 'react';
import { adminFetch, getAdminToken } from '../lib/browser-api';
import { labelOf } from '../lib/labels';
import { formatAddress, formatDateTime, formatPrice } from './admin-format';

type OrderDetail = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  subtotal: string;
  shippingFee: string;
  total: string;
  depositRequired: string;
  paidAmount: string;
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

const orderStatuses = [
  'PENDING_CONFIRMATION',
  'CONFIRMED',
  'WAITING_PAYMENT',
  'PAID',
  'IN_PRODUCTION',
  'READY_TO_SHIP',
  'SHIPPED',
  'COMPLETED',
  'CANCELLED',
  'REFUNDED',
  'BLOCKED'
];

const paymentStatuses = ['UNPAID', 'REFUNDED'];

export function AdminOrderDetail({ id }: { id: string }) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [paymentNotes, setPaymentNotes] = useState<Note[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [message, setMessage] = useState('Dang tai don hang...');

  async function loadOrder() {
    if (!getAdminToken()) {
      setMessage('Vui long dang nhap quan tri truoc.');
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
      setMessage(error instanceof Error ? error.message : 'Khong tai duoc don hang.');
    }
  }

  useEffect(() => {
    void loadOrder();
  }, [id]);

  async function updateOrder(formData: FormData) {
    const status = String(formData.get('status') ?? '');
    const paymentStatus = String(formData.get('paymentStatus') ?? '');
    const trackingCarrier = String(formData.get('trackingCarrier') ?? '').trim();
    const trackingNumber = String(formData.get('trackingNumber') ?? '').trim();
    setMessage('Dang cap nhat don hang...');

    try {
      if (status) {
        await adminFetch(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      }

      if (paymentStatus) {
        await adminFetch(`/orders/${id}/payment`, { method: 'PATCH', body: JSON.stringify({ paymentStatus }) });
      }

      if (trackingCarrier || trackingNumber) {
        await adminFetch(`/orders/${id}/tracking`, {
          method: 'PATCH',
          body: JSON.stringify({ trackingCarrier, trackingNumber })
        });
      }

      await loadOrder();
      setMessage('Da cap nhat don hang.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Khong cap nhat duoc don hang.');
    }
  }

  async function addNote(formData: FormData, type: 'GENERAL' | 'PAYMENT') {
    const body = String(formData.get('body') ?? '').trim();

    if (!body) {
      return;
    }

    setMessage('Dang them ghi chu...');

    try {
      await adminFetch(type === 'PAYMENT' ? `/orders/${id}/payment-notes` : `/orders/${id}/notes`, {
        method: 'POST',
        body: JSON.stringify(type === 'PAYMENT' ? { body } : { type, body })
      });
      await loadOrder();
      setMessage('Da them ghi chu.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Khong them duoc ghi chu.');
    }
  }

  async function cancelOrder() {
    setMessage('Dang huy don hang...');

    try {
      await adminFetch(`/orders/${id}/cancel`, { method: 'POST' });
      await loadOrder();
      setMessage('Da huy don hang.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Khong huy duoc don hang.');
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
          <h2>Thong tin don</h2>
          <dl className="detail-list">
            <div>
              <dt>Khach hang</dt>
              <dd>
                <a href={`/users/${order.user.id}`}>{order.user.name ?? order.user.email}</a>
              </dd>
            </div>
            <div>
              <dt>Lien he</dt>
              <dd>{[order.recipientName, order.recipientPhone].filter(Boolean).join(' / ') || '-'}</dd>
            </div>
            <div>
              <dt>Dia chi</dt>
              <dd>{formatAddress(order.shippingAddress)}</dd>
            </div>
            <div>
              <dt>Ngay tao</dt>
              <dd>{formatDateTime(order.createdAt)}</dd>
            </div>
          </dl>
        </div>
        <div>
          <h2>Tong tien</h2>
          <dl className="detail-list">
            <div>
              <dt>Tam tinh</dt>
              <dd>{formatPrice(order.subtotal)}</dd>
            </div>
            <div>
              <dt>Phi giao hang</dt>
              <dd>{formatPrice(order.shippingFee)}</dd>
            </div>
            <div>
              <dt>Tong</dt>
              <dd>{formatPrice(order.total)}</dd>
            </div>
            <div>
              <dt>Coc can thu</dt>
              <dd>{formatPrice(order.depositRequired)}</dd>
            </div>
            <div>
              <dt>Da thu</dt>
              <dd>{formatPrice(order.paidAmount)}</dd>
            </div>
            <div>
              <dt>Tracking</dt>
              <dd>{[order.trackingCarrier, order.trackingNumber].filter(Boolean).join(' / ') || '-'}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="admin-panel">
        <h2>Cap nhat van hanh</h2>
        <form className="admin-form compact-form" action={updateOrder}>
          <label>
            Trang thai
            <select name="status" defaultValue={order.status}>
              {orderStatuses.map((status) => (
                <option value={status} key={status}>
                  {labelOf(status)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Thanh toan
            <select name="paymentStatus" defaultValue={order.paymentStatus}>
              {paymentStatuses.map((status) => (
                <option value={status} key={status}>
                  {labelOf(status)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Don vi van chuyen
            <input name="trackingCarrier" defaultValue={order.trackingCarrier ?? ''} />
          </label>
          <label>
            Ma tracking
            <input name="trackingNumber" defaultValue={order.trackingNumber ?? ''} />
          </label>
          <div className="row-actions wide-field">
            <button type="submit">Luu cap nhat</button>
            <button className="danger-button" type="button" onClick={() => void cancelOrder()}>
              Huy don
            </button>
          </div>
        </form>
      </section>

      <section className="table-panel">
        <div className="table-row detail-item-row table-head">
          <span>San pham</span>
          <span>So luong</span>
          <span>Don gia</span>
          <span>Thanh tien</span>
        </div>
        {order.items.map((item) => (
          <div className="table-row detail-item-row" key={item.id}>
            <strong>
              {item.productSnapshot?.name ?? 'San pham'}
              <small>{item.productSnapshot?.studio ?? '-'}</small>
            </strong>
            <span>{item.quantity}</span>
            <span>{formatPrice(item.unitPrice)}</span>
            <span>{formatPrice(item.totalPrice)}</span>
          </div>
        ))}
      </section>

      <section className="detail-two-column">
        <NotesPanel title="Ghi chu noi bo" notes={notes} onSubmit={(formData) => addNote(formData, 'GENERAL')} />
        <NotesPanel title="Ghi chu thanh toan" notes={paymentNotes} onSubmit={(formData) => addNote(formData, 'PAYMENT')} />
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
          Noi dung
          <textarea name="body" required />
        </label>
        <button type="submit">Them ghi chu</button>
      </form>
      <div className="detail-list-block">
        {notes.map((note) => (
          <article key={note.id}>
            <strong>{formatDateTime(note.createdAt)}</strong>
            <p>{note.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function TimelinePanel({ items }: { items: TimelineItem[] }) {
  return (
    <section className="admin-panel">
      <h2>Timeline</h2>
      <div className="detail-list-block">
        {items.map((item, index) => (
          <article key={`${item.type}-${item.createdAt}-${index}`}>
            <strong>{labelOf(item.status ?? item.type)}</strong>
            <small>{formatDateTime(item.createdAt)}</small>
            {item.note ? <p>{item.note}</p> : null}
          </article>
        ))}
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
      <h2>Payments</h2>
      <div className="detail-list-block">
        {payments.map((payment) => (
          <article key={payment.id}>
            <strong>
              {payment.provider} / {labelOf(payment.status)}
            </strong>
            <small>{formatDateTime(payment.createdAt)}</small>
            <p>{formatPrice(payment.amount)}</p>
            {payment.providerSessionId ? <p>{payment.providerSessionId}</p> : null}
            {payment.provider === 'manual_bank_transfer' && payment.status === 'UNPAID' ? (
              <button type="button" onClick={() => void onConfirm(payment.id)}>Xác nhận đã nhận chuyển khoản</button>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
