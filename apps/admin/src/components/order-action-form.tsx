'use client';

import { useState } from 'react';
import { adminFetch } from '../lib/browser-api';

export function OrderActionForm() {
  const [message, setMessage] = useState('');

  async function submit(formData: FormData) {
    const orderId = String(formData.get('orderId') ?? '').trim();
    const status = String(formData.get('status') ?? '');
    const paymentStatus = String(formData.get('paymentStatus') ?? '');
    setMessage('Đang cập nhật đơn hàng...');

    try {
      if (status) {
        await adminFetch(`/orders/${orderId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      }
      if (paymentStatus) {
        await adminFetch(`/orders/${orderId}/payment`, { method: 'PATCH', body: JSON.stringify({ paymentStatus }) });
      }
      window.dispatchEvent(new Event('admin:data-changed'));
      setMessage('Đã cập nhật đơn hàng.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không cập nhật được đơn hàng.');
    }
  }

  return (
    <form className="admin-form compact-form" action={submit}>
      <label>
        ID đơn hàng
        <input name="orderId" required />
      </label>
      <label>
        Trạng thái
        <select name="status" defaultValue="">
          <option value="">Không đổi</option>
          <option value="WAITING_DEPOSIT">Chờ thanh toán tiền cọc</option>
          <option value="DEPOSIT_PAID">Đã thanh toán tiền cọc</option>
          <option value="WAITING_SECOND_PAYMENT">Chờ thanh toán đợt 2</option>
          <option value="SECOND_PAYMENT_PAID">Đã thanh toán đợt 2</option>
          <option value="SHIPPING">Đang vận chuyển</option>
          <option value="CONFIRMED">Đã xác nhận Resin</option>
          <option value="WAITING_PAYMENT">Chờ thanh toán</option>
          <option value="PAID">Đã thanh toán</option>
          <option value="IN_PRODUCTION">Đang sản xuất</option>
          <option value="READY_TO_SHIP">Sẵn sàng giao</option>
          <option value="COMPLETED">Hoàn tất</option>
        </select>
      </label>
      <label>
        Thanh toán
        <select name="paymentStatus" defaultValue="">
          <option value="">Không đổi</option>
          <option value="UNPAID">Chưa thanh toán</option>
          <option value="PARTIALLY_PAID">Thanh toán một phần</option>
          <option value="PAID">Đã thanh toán</option>
        </select>
      </label>
      <button type="submit">Cập nhật</button>
      {message ? <p>{message}</p> : null}
    </form>
  );
}
