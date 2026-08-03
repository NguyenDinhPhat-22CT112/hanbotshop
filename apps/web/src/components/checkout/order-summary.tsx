'use client';

import { depositUnitPrice, formatVnd } from '../../lib/checkout-utils';
import type { CartItem as ApiCartItem } from '../../lib/browser-api';

type OrderSummaryProps = {
    items: ApiCartItem[];
    subtotal: string;
    depositRequired: number;
    isLoading: boolean;
};

export function OrderSummary({ items, subtotal, depositRequired, isLoading }: OrderSummaryProps) {
    if (isLoading) {
        return (
            <aside className="checkout-summary" aria-labelledby="checkout-summary-title">
                <div className="checkout-summary-loading">
                    <div className="loading-spinner" />
                    <p>Đang tải giỏ hàng...</p>
                </div>
            </aside>
        );
    }

    if (!items.length) {
        return (
            <aside className="checkout-summary" aria-labelledby="checkout-summary-title">
                <div className="checkout-empty-state" role="alert">
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <circle cx="9" cy="21" r="1" stroke="currentColor" strokeWidth="2" />
                        <circle cx="20" cy="21" r="1" stroke="currentColor" strokeWidth="2" />
                        <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <p>Giỏ hàng đang trống</p>
                    <a href="/san-pham" className="checkout-empty-link">
                        Tiếp tục mua hàng
                    </a>
                </div>
            </aside>
        );
    }

    return (
        <aside className="checkout-summary" aria-labelledby="checkout-summary-title">
            <div className="checkout-summary-header">
                <h2 id="checkout-summary-title">Tóm tắt đơn hàng</h2>
                <a href="/cart" className="checkout-edit-cart">
                    Sửa
                </a>
            </div>

            <div className="checkout-items">
                {items.map((item) => (
                    <article className="checkout-item" key={item.id}>
                        <div className="checkout-item-content">
                            <div className="checkout-item-header">
                                <strong className="checkout-item-name">{item.product.name}</strong>
                                <strong className="checkout-item-price">
                                    {item.paymentRequirement === 'DEPOSIT' ? (
                                        <>
                                            {formatVnd(String(Number(depositUnitPrice(item)) * item.quantity))}
                                            {Number(item.unitPrice) !== Number(depositUnitPrice(item)) ? (
                                                <s className="checkout-item-full-price">{formatVnd(item.totalPrice)}</s>
                                            ) : null}
                                        </>
                                    ) : (
                                        formatVnd(item.totalPrice)
                                    )}
                                </strong>
                            </div>

                            <div className="checkout-item-meta">
                                <span className="checkout-item-type">
                                    {item.product.orderType === 'RESIN' ? 'Đơn Resin' : 'Đơn Order'}
                                </span>
                                {item.variant?.name && (
                                    <>
                                        <span className="meta-divider">·</span>
                                        <span>{item.variant.name}</span>
                                    </>
                                )}
                                <span className="meta-divider">·</span>
                                <span>SL: {item.quantity}</span>
                            </div>

                            {item.paymentRequirement === 'DEPOSIT' ? (
                                <span className="checkout-item-badge checkout-item-badge--deposit">
                                    Cọc {item.product.depositPercent}%
                                </span>
                            ) : (
                                <span className="checkout-item-badge checkout-item-badge--full">
                                    Thanh toán đủ
                                </span>
                            )}
                        </div>
                    </article>
                ))}
            </div>

            <div className="checkout-summary-divider" />

            <dl className="checkout-totals">
                <div className="checkout-total-row">
                    <dt>Tạm tính</dt>
                    <dd>{formatVnd(subtotal)}</dd>
                </div>
                <div className="checkout-total-row">
                    <dt>Phí giao hàng</dt>
                    <dd className="checkout-shipping-note">Shop xác nhận</dd>
                </div>
                <div className="checkout-total-row checkout-total-highlight">
                    <dt>Cần thanh toán trước</dt>
                    <dd className="checkout-total-amount">{formatVnd(String(depositRequired))}</dd>
                </div>
            </dl>

            <div className="checkout-summary-note">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                    <path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <p>
                    Phí giao hàng sẽ được xác định sau khi shop kiểm tra tồn kho và địa chỉ.
                    Shop sẽ liên hệ xác nhận số tiền cọc chính xác và lịch giao hàng.
                </p>
            </div>

            <div className="checkout-security-badge">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <span>Thông tin được mã hóa và bảo mật</span>
            </div>
        </aside>
    );
}
