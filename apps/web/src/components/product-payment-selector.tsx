'use client';

import { useState } from 'react';

type ProductPaymentSelectorProps = {
  fullPrice: string;
  depositPrice?: string | null;
};

export function ProductPaymentSelector({ fullPrice, depositPrice }: ProductPaymentSelectorProps) {
  const [selectedMode, setSelectedMode] = useState<'full' | 'deposit'>('full');
  const canSelectDeposit = Boolean(depositPrice && depositPrice !== fullPrice);
  const displayedPrice = selectedMode === 'deposit' && canSelectDeposit ? depositPrice : fullPrice;

  return (
    <>
      <p className="detail-price" aria-live="polite">{displayedPrice}</p>

      <div className="payment-mode">
        <strong>Thanh toán</strong>
        <button
          type="button"
          className={selectedMode === 'full' ? 'selected' : ''}
          aria-pressed={selectedMode === 'full'}
          onClick={() => setSelectedMode('full')}
        >
          Full
        </button>
        <button
          type="button"
          className={selectedMode === 'deposit' ? 'selected' : ''}
          aria-pressed={selectedMode === 'deposit'}
          disabled={!canSelectDeposit}
          onClick={() => setSelectedMode('deposit')}
        >
          Cọc
        </button>
      </div>
    </>
  );
}
