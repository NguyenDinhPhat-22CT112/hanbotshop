'use client';

import { useState } from 'react';
import { createPaymentSession } from '../lib/browser-api';

type PaymentActionButtonProps = {
  orderId: string;
};

export function PaymentActionButton({ orderId }: PaymentActionButtonProps) {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function startPayment() {
    setIsLoading(true);
    setMessage('Đang mở thanh toán...');

    try {
      const payload = await createPaymentSession(orderId);
      window.location.href = payload.checkoutUrl;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Chưa tạo được phiên thanh toán.');
      setIsLoading(false);
    }
  }

  return (
    <div className="payment-action">
      <button className="primary-link payment-action-button" type="button" disabled={isLoading} onClick={() => void startPayment()}>
        {isLoading ? 'Đang mở thanh toán...' : 'Thanh toán đơn hàng'}
      </button>
      {message ? <p className="form-message">{message}</p> : null}
    </div>
  );
}
