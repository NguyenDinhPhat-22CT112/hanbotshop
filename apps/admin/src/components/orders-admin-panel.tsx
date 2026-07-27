'use client';

import { useEffect, useState } from 'react';
import { adminFetch, getAdminToken } from '../lib/browser-api';
import { labelOf } from '../lib/labels';
import { buildQuery, PaginationControls, type ListMeta } from './list-pagination';

type OrderRow = {
  id: string;
  orderNumber: string;
  type: 'ORDER' | 'RESIN';
  status: string;
  paymentStatus: string;
  total: string;
  trackingNumber: string | null;
  trackingCarrier: string | null;
  user: {
    email: string;
    name: string | null;
  };
};

type OrderResponse = {
  data: OrderRow[];
  meta: ListMeta;
};

type Filters = {
  type: 'ORDER' | 'RESIN';
  q: string;
  status: string;
  paymentStatus: string;
  page: number;
  pageSize: number;
};

const defaultFilters: Filters = {
  type: 'ORDER',
  q: '',
  status: '',
  paymentStatus: '',
  page: 1,
  pageSize: 20
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

function formatPrice(value: string) {
  const numericValue = Number(value);

  return Number.isNaN(numericValue) ? value : `${new Intl.NumberFormat('vi-VN').format(numericValue)} VND`;
}

export function OrdersAdminPanel() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [meta, setMeta] = useState<ListMeta | null>(null);
  const [message, setMessage] = useState('Đang tải đơn hàng...');

  async function loadOrders(nextFilters = filters) {
    if (!getAdminToken()) {
      setMessage('Vui lòng đăng nhập quản trị trước.');
      return;
    }

    try {
      const payload = await adminFetch<OrderResponse>(`/orders?${buildQuery(nextFilters)}`);
      setOrders(payload.data);
      setMeta(payload.meta);
      setFilters(nextFilters);
      setMessage(payload.data.length ? '' : 'Không có đơn hàng phù hợp.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không tải được đơn hàng.');
    }
  }

  useEffect(() => {
    void loadOrders(defaultFilters);
    const reload = () => void loadOrders(defaultFilters);
    window.addEventListener('admin:data-changed', reload);

    return () => window.removeEventListener('admin:data-changed', reload);
  }, []);

  function applyFilters(formData: FormData) {
    void loadOrders({
      type: String(formData.get('type') ?? 'ORDER') as Filters['type'],
      q: String(formData.get('q') ?? '').trim(),
      status: String(formData.get('status') ?? ''),
      paymentStatus: String(formData.get('paymentStatus') ?? ''),
      page: 1,
      pageSize: Number(formData.get('pageSize') ?? 20)
    });
  }

  async function updateOrder(orderId: string, formData: FormData) {
    const status = String(formData.get('status') ?? '');
    const trackingCarrier = String(formData.get('trackingCarrier') ?? '').trim();
    const trackingNumber = String(formData.get('trackingNumber') ?? '').trim();
    setMessage('Đang cập nhật đơn hàng...');

    try {
      if (status) {
        await adminFetch(`/orders/${orderId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      }
      if (trackingCarrier && trackingNumber) {
        await adminFetch(`/orders/${orderId}/tracking`, { method: 'PATCH', body: JSON.stringify({ trackingCarrier, trackingNumber }) });
      }
      await loadOrders();
      setMessage('Đã cập nhật đơn hàng.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không cập nhật được đơn hàng.');
    }
  }

  return (
    <div className="detail-stack">
      <nav className="row-actions" aria-label="Loại đơn hàng">
        <button
          type="button"
          className={filters.type === 'ORDER' ? undefined : 'secondary-button'}
          onClick={() => void loadOrders({ ...defaultFilters, type: 'ORDER' })}
        >
          Đơn Order
        </button>
        <button
          type="button"
          className={filters.type === 'RESIN' ? undefined : 'secondary-button'}
          onClick={() => void loadOrders({ ...defaultFilters, type: 'RESIN' })}
        >
          Đơn Resin
        </button>
      </nav>
      <section className="admin-panel filter-panel">
        <div className="filter-title"><div><strong>Bộ lọc đơn hàng</strong><span>Tìm theo mã đơn, khách hàng và trạng thái</span></div>{meta ? <small>{meta.total} đơn hàng</small> : null}</div>
        <form className="admin-form filter-form" action={applyFilters}>
          <input type="hidden" name="type" value={filters.type} />
          <label>
            Search
            <input name="q" defaultValue={filters.q} placeholder="Mã đơn, khách, email, phone" />
          </label>
          <label>
            Status
            <select name="status" defaultValue={filters.status}>
              <option value="">Tất cả</option>
              {statusesFor(filters.type).map((status) => (
                <option value={status} key={status}>
                  {labelOf(status)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Payment
            <select name="paymentStatus" defaultValue={filters.paymentStatus}>
              <option value="">Tất cả</option>
              <option value="UNPAID">Chưa thanh toán</option>
              <option value="PARTIALLY_PAID">Thanh toán một phần</option>
              <option value="PAID">Đã thanh toán</option>
            </select>
          </label>
          <label>
            Page size
            <select name="pageSize" defaultValue={filters.pageSize}>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </label>
          <button type="submit">Lọc</button>
        </form>
      </section>

      <section className="table-panel">
        <div className="table-row order-row table-head">
          <span>Đơn hàng</span>
          <span>Khách hàng</span>
          <span>Trạng thái</span>
          <span>Thanh toán</span>
          <span>Giao hàng</span>
          <span>Tổng tiền</span>
          <span>Thao tác</span>
        </div>
        {orders.map((order) => (
          <form className="table-row order-row order-manage-row" action={(formData) => void updateOrder(order.id, formData)} key={order.id}>
            <strong>
              <a href={`/orders/${encodeURIComponent(order.id)}`}>{order.orderNumber}</a>
              <small>{order.type === 'RESIN' ? 'Đơn Resin' : 'Đơn Order'} · {order.id}</small>
            </strong>
            <span>{order.user.name ?? order.user.email}</span>
            <label>
              <small>Trạng thái</small>
              <select name="status" defaultValue={order.status}>
                {statusesFor(order.type).map((status) => (
                  <option value={status} key={status}>
                    {labelOf(status)}
                  </option>
                ))}
              </select>
            </label>
            <span>{labelOf(order.paymentStatus)}</span>
            <div className="tracking-fields">
              <input name="trackingCarrier" defaultValue={order.trackingCarrier ?? ''} placeholder="Đơn vị vận chuyển" />
              <input name="trackingNumber" defaultValue={order.trackingNumber ?? ''} placeholder="Mã tracking" />
            </div>
            <span>{formatPrice(order.total)}</span>
            <button type="submit">Lưu</button>
          </form>
        ))}
        {message ? <p className="admin-message table-message">{message}</p> : null}
      </section>
      <PaginationControls meta={meta} onPageChange={(page) => void loadOrders({ ...filters, page })} />
    </div>
  );
}
