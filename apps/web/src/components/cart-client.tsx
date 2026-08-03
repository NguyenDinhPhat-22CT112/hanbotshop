'use client';

import { useEffect, useState } from 'react';
import { ApiError, getCart, removeCartItem, updateCartItem } from '../lib/browser-api';
import { getGuestCart, isGuestCartStorageEvent, removeGuestCartItem, updateGuestCartItem } from '../lib/guest-cart';
import { calculateDepositRequired, depositUnitPrice } from '../lib/checkout-utils';

type CartState = Awaited<ReturnType<typeof getCart>>;

function formatVnd(value: string) {
  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) {
    return `${value} VND`;
  }

  return `${new Intl.NumberFormat('vi-VN').format(numericValue)}đ`;
}

export function CartClient() {
  const [cart, setCart] = useState<CartState | null>(null);
  const [message, setMessage] = useState('Đang tải giỏ hàng...');
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [cartOwner, setCartOwner] = useState<'account' | 'guest'>('guest');
  const [busyItemId, setBusyItemId] = useState<string | null>(null);

  async function loadCart() {
    try {
      const payload = await getCart();
      setCart(payload);
      setMessage('');
      setState('ready');
      setCartOwner('account');
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setCart(getGuestCart());
        setCartOwner('guest');
        setState('ready');
        setMessage('');
        return;
      }

      setState('error');
      setMessage(error instanceof Error ? error.message : 'Chưa tải được giỏ hàng.');
    }
  }

  useEffect(() => {
    void loadCart();

    const refreshCart = () => {
      void loadCart();
    };
    const refreshGuestCart = (event: StorageEvent) => {
      if (isGuestCartStorageEvent(event)) {
        void loadCart();
      }
    };

    window.addEventListener('cart-updated', refreshCart);
    window.addEventListener('storage', refreshGuestCart);

    return () => {
      window.removeEventListener('cart-updated', refreshCart);
      window.removeEventListener('storage', refreshGuestCart);
    };
  }, []);

  async function changeQuantity(itemId: string, quantity: number) {
    if (quantity < 1) {
      return;
    }

    setBusyItemId(itemId);

    try {
      const payload = cartOwner === 'guest'
        ? updateGuestCartItem(itemId, quantity)
        : await updateCartItem(itemId, quantity);
      setCart(payload);
      setMessage('');
      setState('ready');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không cập nhật được giỏ hàng.');
    } finally {
      setBusyItemId(null);
    }
  }

  async function deleteItem(itemId: string) {
    setBusyItemId(itemId);

    try {
      const payload = cartOwner === 'guest'
        ? removeGuestCartItem(itemId)
        : await removeCartItem(itemId);
      setCart(payload);
      setMessage('');
      setState('ready');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không xóa được sản phẩm.');
    } finally {
      setBusyItemId(null);
    }
  }

  if (state === 'loading' || state === 'error') {
    return (
      <div className={`cart-empty-state cart-empty-state--${state}`}>
        <h2>{state === 'error' ? 'Chưa tải được giỏ hàng' : 'Đang tải giỏ hàng'}</h2>
        <p>{message}</p>
        <div className="cart-empty-actions">
          <a className="cart-secondary-link" href="/san-pham">
            Tiếp tục mua hàng
          </a>
        </div>
      </div>
    );
  }

  if (!cart?.items.length) {
    return (
      <div className="cart-empty-state">
        <h2>Giỏ hàng đang trống</h2>
        <p>Bạn chưa có sản phẩm nào trong giỏ hàng.</p>
        <a className="cart-continue-shopping" href="/san-pham">
          Tiếp tục mua hàng
        </a>
      </div>
    );
  }

  return (
    <div className="cart-layout">
      <div className="cart-items-section">
        <div className="cart-items-list">
          {cart.items.map((item) => (
            <article className="cart-item" key={item.id}>
              <div className="cart-item-image">
                {item.product.imageUrl ? (
                  <img src={item.product.imageUrl} alt={item.product.name} />
                ) : (
                  <div className="cart-item-image-placeholder">
                    <span>{item.product.name.charAt(0)}</span>
                  </div>
                )}
              </div>

              <div className="cart-item-info">
                <h3 className="cart-item-name">{item.product.name}</h3>
                {item.variant?.name ? <p className="cart-item-variant">{item.variant.name}</p> : null}
                <div className="cart-item-price-row">
                  <p className="cart-item-price">
                    {item.paymentRequirement === 'DEPOSIT' ? (
                      <>
                        {formatVnd(depositUnitPrice(item))}
                        {Number(item.unitPrice) !== Number(depositUnitPrice(item)) ? (
                          <s className="cart-item-full-price">{formatVnd(item.unitPrice)}</s>
                        ) : null}
                      </>
                    ) : (
                      formatVnd(item.unitPrice)
                    )}
                  </p>
                  {item.paymentRequirement === 'DEPOSIT' ? (
                    <span className="cart-item-badge cart-item-badge--deposit">Cọc {item.product.depositPercent}%</span>
                  ) : (
                    <span className="cart-item-badge cart-item-badge--full">Thanh toán đủ</span>
                  )}
                </div>

                <div className="cart-item-actions">
                  <div className="cart-quantity-control" aria-label={`Số lượng ${item.product.name}`}>
                    <button
                      type="button"
                      disabled={busyItemId === item.id || item.quantity <= 1}
                      onClick={() => void changeQuantity(item.id, item.quantity - 1)}
                      aria-label="Giảm số lượng"
                    >
                      −
                    </button>
                    <input type="text" value={item.quantity} readOnly aria-label="Số lượng" />
                    <button
                      type="button"
                      disabled={busyItemId === item.id || item.quantity >= 99}
                      onClick={() => void changeQuantity(item.id, item.quantity + 1)}
                      aria-label="Tăng số lượng"
                    >
                      +
                    </button>
                  </div>

                  <button className="cart-remove-btn" type="button" disabled={busyItemId === item.id} onClick={() => void deleteItem(item.id)}>
                    Xóa
                  </button>
                </div>
              </div>

              <div className="cart-item-total">
                <strong>
                  {item.paymentRequirement === 'DEPOSIT'
                    ? formatVnd(String(Number(depositUnitPrice(item)) * item.quantity))
                    : formatVnd(item.totalPrice)}
                </strong>
              </div>
            </article>
          ))}
        </div>
      </div>

      <aside className="cart-summary">
        <div className="cart-summary-inner">
          <h2>Thông tin đơn hàng</h2>

          <div className="cart-summary-row">
            <span>Tạm tính</span>
            <strong>{formatVnd(cart.subtotal)}</strong>
          </div>

          {cart.items.some((item) => item.paymentRequirement === 'DEPOSIT') ? (
            <div className="cart-summary-row">
              <span>Cọc cần thanh toán trước</span>
              <strong>{formatVnd(String(calculateDepositRequired(cart.items)))}</strong>
            </div>
          ) : null}

          <div className="cart-summary-note">
            <p>Phí vận chuyển sẽ được tính ở trang thanh toán.</p>
            <p>Shop sẽ xác nhận tình trạng hàng trước khi hoàn tất đơn.</p>
          </div>

          <div className="cart-summary-total">
            <span>Tổng tiền:</span>
            <strong className="cart-summary-total-amount">{formatVnd(cart.subtotal)}</strong>
          </div>

          <a className="cart-checkout-btn" href={cartOwner === 'guest' ? '/login?next=%2Fcheckout' : '/checkout'}>
            THANH TOÁN
          </a>

          <a className="cart-continue-shopping" href="/san-pham">
            ← Tiếp tục mua hàng
          </a>

          <div className="cart-policies">
            <p>
              <strong>Chính sách mua hàng</strong>
            </p>
            <p>Đơn hàng figure/pre-order sẽ được shop kiểm tra và liên hệ xác nhận trước khi xử lý thanh toán.</p>
          </div>
        </div>
      </aside>
    </div>
  );
}
