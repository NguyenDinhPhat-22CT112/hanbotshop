'use client';

import { useEffect, useState } from 'react';
import { adminFetch, getAdminToken } from '../lib/browser-api';

type OrderRow = {
  id: string;
  orderNumber: string;
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
};

function formatPrice(value: string) {
  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) {
    return value;
  }

  return `${new Intl.NumberFormat('vi-VN').format(numericValue)} VND`;
}

export function OrdersPanel() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [message, setMessage] = useState('Đang tải đơn hàng...');

  async function loadOrders() {
    if (!getAdminToken()) {
      setMessage('Vui lòng đăng nhập quản trị trước.');
      return;
    }

    try {
      const payload = await adminFetch<OrderResponse>('/orders?pageSize=100');
      setOrders(payload.data);
      setMessage(payload.data.length ? '' : 'Chưa có đơn hàng.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không tải được đơn hàng.');
    }
  }

  useEffect(() => {
    void loadOrders();
    window.addEventListener('admin:data-changed', loadOrders);

    return () => window.removeEventListener('admin:data-changed', loadOrders);
  }, []);

  async function updateOrder(orderId: string, formData: FormData) {
    const status = String(formData.get('status') ?? '');
    const paymentStatus = String(formData.get('paymentStatus') ?? '');
    const trackingCarrier = String(formData.get('trackingCarrier') ?? '').trim();
    const trackingNumber = String(formData.get('trackingNumber') ?? '').trim();
    setMessage('Đang cập nhật đơn hàng...');

    try {
      if (status) {
        await adminFetch(`/orders/${orderId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      }
      if (paymentStatus) {
        await adminFetch(`/orders/${orderId}/payment`, { method: 'PATCH', body: JSON.stringify({ paymentStatus }) });
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
      {orders.length ? (
        orders.map((order) => (
          <form className="table-row order-row order-manage-row" action={(formData) => void updateOrder(order.id, formData)} key={order.id}>
            <strong>
              <a href={`/orders/${encodeURIComponent(order.id)}`}>{order.orderNumber}</a>
              <small>{order.id}</small>
            </strong>
            <span>{order.user.name ?? order.user.email}</span>
            <label>
              <small>Trạng thái</small>
              <select name="status" defaultValue={order.status}>
                <option value="PENDING_CONFIRMATION">Chờ xác nhận</option>
                <option value="CONFIRMED">Đã xác nhận</option>
                <option value="WAITING_PAYMENT">Chờ thanh toán</option>
                <option value="PAID">Đã thanh toán</option>
                <option value="IN_PRODUCTION">Đang sản xuất</option>
                <option value="READY_TO_SHIP">Sẵn sàng giao</option>
                <option value="SHIPPED">Đang giao</option>
                <option value="COMPLETED">Hoàn tất</option>
                <option value="CANCELLED">Đã hủy</option>
                <option value="REFUNDED">Đã hoàn tiền</option>
                <option value="BLOCKED">Đang vướng</option>
              </select>
            </label>
            <label>
              <small>Thanh toán</small>
              <select name="paymentStatus" defaultValue={order.paymentStatus}>
                <option value="UNPAID">Chưa thanh toán</option>
                <option value="PARTIALLY_PAID">Thanh toán một phần</option>
                <option value="PAID">Đã thanh toán</option>
                <option value="REFUNDED">Đã hoàn tiền</option>
              </select>
            </label>
            <div className="tracking-fields">
              <input name="trackingCarrier" defaultValue={order.trackingCarrier ?? ''} placeholder="Đơn vị vận chuyển" />
              <input name="trackingNumber" defaultValue={order.trackingNumber ?? ''} placeholder="Mã tracking" />
            </div>
            <span>{formatPrice(order.total)}</span>
            <button type="submit">Lưu</button>
          </form>
        ))
      ) : (
        <div className="table-row order-row">
          <span>{message}</span>
        </div>
      )}
      {message ? <p className="admin-message table-message">{message}</p> : null}
    </section>
  );
}
