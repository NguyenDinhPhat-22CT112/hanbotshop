'use client';

import { useEffect, useState } from 'react';
import { getPayment, type BankTransferPayment } from '../lib/browser-api';

type PaymentModalProps = {
  paymentId: string | null;
  onClose: () => void;
};

export function PaymentModal({ paymentId, onClose }: PaymentModalProps) {
  const [payment, setPayment] = useState<BankTransferPayment | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!paymentId) {
      setPayment(null);
      setMessage('');
      return;
    }

    setPayment(null);
    setMessage('Đang tải thông tin thanh toán...');
    getPayment(paymentId)
      .then((result) => {
        setPayment(result);
        setMessage('');
      })
      .catch((error) => {
        setMessage(error instanceof Error ? error.message : 'Không tải được thông tin thanh toán.');
      });
  }, [paymentId]);

  useEffect(() => {
    if (!paymentId) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [onClose, paymentId]);

  if (!paymentId) {
    return null;
  }

  return (
    <div
      className="payment-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) {
          onClose();
        }
      }}
    >
      <section
        className="payment-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-modal-title"
        aria-describedby="payment-modal-description"
      >
        <header className="payment-modal-header">
          <div className="payment-modal-heading">
            <span className="payment-modal-kicker">
              <LockIcon />
              Thanh toán chuyển khoản
            </span>
            <h2 id="payment-modal-title">Hoàn tất thanh toán</h2>
            <p id="payment-modal-description">
              Quét VietQR hoặc sao chép thông tin bên dưới để thanh toán đơn hàng.
            </p>
          </div>
          <button
            className="payment-modal-close"
            type="button"
            onClick={onClose}
            aria-label="Đóng bảng thanh toán"
            autoFocus
          >
            <CloseIcon />
          </button>
        </header>

        {payment ? (
          <PaymentDetails payment={payment} />
        ) : (
          <div className="payment-loading-state" role="status">
            <span aria-hidden="true" />
            <p>{message}</p>
          </div>
        )}

        <footer className="payment-modal-footer">
          <div className="payment-support-note">
            <span aria-hidden="true">?</span>
            <p>
              <strong>Cần hỗ trợ?</strong>
              Shop sẽ đối chiếu và cập nhật trạng thái sau khi tiền vào tài khoản.
            </p>
          </div>
          <button type="button" onClick={onClose}>Đóng</button>
        </footer>
      </section>
    </div>
  );
}

export function BankTransferPaymentPanel({ paymentId }: { paymentId: string }) {
  const [payment, setPayment] = useState<BankTransferPayment | null>(null);
  const [message, setMessage] = useState('Đang tải thông tin chuyển khoản...');

  useEffect(() => {
    if (!paymentId) {
      setMessage('Thiếu mã thanh toán. Vui lòng mở lại đơn hàng và chọn thanh toán.');
      return;
    }

    getPayment(paymentId)
      .then((result) => {
        setPayment(result);
        setMessage('');
      })
      .catch((error) => {
        setMessage(error instanceof Error ? error.message : 'Không tải được thông tin chuyển khoản.');
      });
  }, [paymentId]);

  if (!payment) {
    return <p className="form-message">{message}</p>;
  }

  return (
    <article className="detail-panel payment-placeholder-panel">
      <header>
        <p className="eyebrow">Thanh toán đơn hàng</p>
        <h2>Chuyển khoản ngân hàng</h2>
        <p>Quét mã QR hoặc sử dụng thông tin bên dưới để thanh toán đơn hàng.</p>
      </header>
      <PaymentDetails payment={payment} />
    </article>
  );
}

function PaymentDetails({ payment }: { payment: BankTransferPayment }) {
  const details = payment.payload ?? {};
  const transferContent = details.transferContent || payment.providerReference || '';
  const isConfigured = Boolean(details.accountNumber && details.accountName);
  const isPaid = payment.status === 'PAID';

  return (
    <div className="payment-details">
      <div className="payment-qr-layout">
        <section className="payment-qr-section" aria-labelledby="payment-qr-heading">
          <StepHeading
            number="01"
            title="Quét mã VietQR"
            description="Mở ứng dụng ngân hàng và quét mã"
            id="payment-qr-heading"
          />
          <div className="payment-qr-frame">
            <img
              src={details.qrUrl || '/payment/mb-vietqr-nguyen-cao-phi.png'}
              alt={`Mã VietQR thanh toán đơn ${payment.order.orderNumber}`}
              onError={(e) => {
                // Fallback to default QR if image fails to load
                const img = e.currentTarget;
                if (img.src !== window.location.origin + '/payment/mb-vietqr-nguyen-cao-phi.png') {
                  img.src = '/payment/mb-vietqr-nguyen-cao-phi.png';
                }
              }}
            />
          </div>
          <p className="payment-qr-note">
            <InfoIcon />
            QR cố định — vui lòng nhập đúng số tiền và nội dung chuyển khoản.
          </p>
        </section>

        <section className="payment-summary-card" aria-labelledby="payment-info-heading">
          <div className="payment-amount-card">
            <div>
              <span>Số tiền cần chuyển</span>
              <small>Đơn hàng #{payment.order.orderNumber}</small>
            </div>
            <strong>{formatVnd(payment.amount)}</strong>
            <CopyButton value={payment.amount} label="Sao chép số tiền" disabled={!payment.amount} />
          </div>

          <p className={`payment-confirmation-state ${isPaid ? 'is-paid' : ''}`}>
            <span aria-hidden="true" />
            {isPaid ? 'Shop đã xác nhận thanh toán' : 'Đang chờ shop xác nhận thanh toán'}
          </p>

          <StepHeading
            number="02"
            title="Thông tin người nhận"
            description="Kiểm tra trước khi chuyển khoản"
            id="payment-info-heading"
          />

          {!isConfigured ? (
            <p className="payment-config-notice" role="note">
              Thông tin nhận thanh toán và mã QR đang chờ shop cập nhật.
            </p>
          ) : null}

          <dl className="bank-transfer-details">
            <PaymentDetailRow label="Ngân hàng" value={details.bankName || details.bankCode || 'Chưa cập nhật'} />
            <PaymentDetailRow
              label="Số tài khoản"
              value={details.accountNumber || 'Chưa cập nhật'}
              copyable={Boolean(details.accountNumber)}
            />
            <PaymentDetailRow label="Người nhận" value={details.accountName || 'Chưa cập nhật'} />
            <PaymentDetailRow
              label="Nội dung chuyển khoản"
              value={transferContent || 'Chưa cập nhật'}
              copyable={Boolean(transferContent)}
              emphasized
            />
          </dl>

          {details.instructions ? <p className="payment-instructions">{details.instructions}</p> : null}
        </section>
      </div>

      <div className="payment-bottom-actions">
        <p>
          <CheckIcon />
          Lưu lại biên lai để shop hỗ trợ đối chiếu khi cần.
        </p>
        <a className="primary-link" href={`/account/orders/${encodeURIComponent(payment.order.id)}`}>
          Xem chi tiết đơn hàng
          <ArrowIcon />
        </a>
      </div>
    </div>
  );
}

function StepHeading({
  number,
  title,
  description,
  id
}: {
  number: string;
  title: string;
  description: string;
  id: string;
}) {
  return (
    <div className="payment-step-heading">
      <span>{number}</span>
      <div>
        <strong id={id}>{title}</strong>
        <small>{description}</small>
      </div>
    </div>
  );
}

function PaymentDetailRow({
  label,
  value,
  copyable = false,
  emphasized = false
}: {
  label: string;
  value: string;
  copyable?: boolean;
  emphasized?: boolean;
}) {
  return (
    <div className={emphasized ? 'is-emphasized' : undefined}>
      <dt>{label}</dt>
      <dd>
        <span>{value}</span>
        {copyable ? <CopyButton value={value} label={`Sao chép ${label.toLowerCase()}`} /> : null}
      </dd>
    </div>
  );
}

function CopyButton({ value, label, disabled = false }: { value: string; label: string; disabled?: boolean }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      className={`payment-copy-button ${copied ? 'is-copied' : ''}`}
      type="button"
      onClick={() => void copy()}
      disabled={disabled}
      aria-label={label}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
      <span aria-live="polite">{copied ? 'Đã sao chép' : 'Sao chép'}</span>
    </button>
  );
}

function formatVnd(value: string) {
  return `${new Intl.NumberFormat('vi-VN').format(Number(value))} ₫`;
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="8" y="8" width="11" height="11" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function QrIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v6h-6v-2" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
