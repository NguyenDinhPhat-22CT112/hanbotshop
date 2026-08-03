'use client';

import { useState } from 'react';
import { createPaymentSession } from '../lib/browser-api';
import { PaymentModal } from './bank-transfer-payment';

type PaymentActionButtonProps = {
  orderId: string;
};

export function PaymentActionButton({ orderId }: PaymentActionButtonProps) {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);

  async function startPayment() {
    setIsLoading(true);
    setMessage('Đang mở thanh toán...');

    try {
      const payload = await createPaymentSession(orderId);
      setPaymentId(payload.payment.id);
      setMessage('');
      setIsLoading(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Chưa tạo được phiên thanh toán.');
      setIsLoading(false);
    }
  }

  return (
    <>
      <div className="payment-action">
        <button className="primary-link payment-action-button" type="button" disabled={isLoading} onClick={() => void startPayment()}>
          💳 {isLoading ? 'Đang mở thanh toán...' : 'Thanh Toán Đơn Hàng'}
        </button>
        {message ? <p className="form-message">{message}</p> : null}
      </div>
      <PaymentModal key={paymentId || 'closed'} paymentId={paymentId} onClose={() => setPaymentId(null)} />
    </>
  );
}
