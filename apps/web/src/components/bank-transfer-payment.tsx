'use client';

import { useEffect, useState } from 'react';
import { getPayment, type BankTransferPayment } from '../lib/browser-api';

export function BankTransferPaymentPanel({ paymentId }: { paymentId: string }) {
  const [payment, setPayment] = useState<BankTransferPayment | null>(null);
  const [message, setMessage] = useState('Đang tải thông tin chuyển khoản...');

  useEffect(() => {
    if (!paymentId) {
      setMessage('Thiếu mã thanh toán. Vui lòng mở lại đơn hàng và chọn thanh toán.');
      return;
    }

    getPayment(paymentId)
      .then((result) => { setPayment(result); setMessage(''); })
      .catch((error) => setMessage(error instanceof Error ? error.message : 'Không tải được thông tin chuyển khoản.'));
  }, [paymentId]);

  if (!payment) return <p className="form-message">{message}</p>;
  const details = payment.payload ?? {};

  return (
    <article className="detail-panel payment-placeholder-panel">
      <h2>Chuyển khoản ngân hàng</h2>
      <p>Vui lòng chuyển đúng số tiền và nội dung bên dưới để shop đối soát đơn, tránh ghi thêm nội dung khác.</p>
      <dl className="bank-transfer-details">
        <div><dt>Ngân hàng</dt><dd>{details.bankName || details.bankCode || 'Chưa cấu hình'}</dd></div>
        <div><dt>Số tài khoản</dt><dd>{details.accountNumber || 'Chưa cấu hình'}</dd></div>
        <div><dt>Chủ tài khoản</dt><dd>{details.accountName || 'Chưa cấu hình'}</dd></div>
        <div><dt>Số tiền</dt><dd>{formatVnd(payment.amount)}</dd></div>
        <div><dt>Nội dung</dt><dd>{details.transferContent || payment.providerReference}</dd></div>
        <div><dt>Mã đơn</dt><dd>{payment.order.orderNumber}</dd></div>
      </dl>
      {details.instructions ? <p>{details.instructions}</p> : null}
      <p>Trạng thái: <strong>{payment.status === 'PAID' ? 'Đã xác nhận thanh toán' : 'Chờ shop xác nhận'}</strong></p>
      <a className="primary-link" href={`/account/orders/${encodeURIComponent(payment.order.id)}`}>Xem chi tiết đơn hàng</a>
    </article>
  );
}

function formatVnd(value: string) {
  return `${new Intl.NumberFormat('vi-VN').format(Number(value))} VND`;
}
