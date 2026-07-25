'use client';

import { useEffect, useRef, useState } from 'react';
import { ApiError, authenticate, clearToken, getCart, getCurrentUser, type AuthUser } from '../lib/browser-api';
import {
  clearGuestCart,
  getGuestCart,
  isGuestCartStorageEvent,
  mergeGuestCartAfterAuthentication
} from '../lib/guest-cart';

type CartState = Awaited<ReturnType<typeof getCart>>;
type OpenPanel = 'account' | 'cart' | null;

function formatPrice(value: string | undefined) {
  const numericValue = Number(value ?? 0);

  if (Number.isNaN(numericValue)) {
    return value ?? '0 VND';
  }

  return `${new Intl.NumberFormat('vi-VN').format(numericValue)}đ`;
}

function getDisplayName(user: AuthUser | null) {
  return user?.name?.trim() || user?.email?.split('@')[0] || 'Tài khoản';
}

export function HeaderActions() {
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const [cart, setCart] = useState<CartState | null>(null);
  const [cartMessage, setCartMessage] = useState('Hiện chưa có sản phẩm');
  const [accountMessage, setAccountMessage] = useState('');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const [isLoginSubmitting, setIsLoginSubmitting] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  async function loadCartForCurrentSession() {
    try {
      const payload = await getCart();
      setCart(payload);
      setCartMessage(payload.items.length ? '' : 'Hiện chưa có sản phẩm');
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        const guestCart = getGuestCart();
        setCart(guestCart);
        setCartMessage(guestCart.items.length ? '' : 'Hiện chưa có sản phẩm');
        return;
      }

      setCart(null);
      setCartMessage('Chưa tải được giỏ hàng.');
    }
  }

  useEffect(() => {
    let isMounted = true;
    const initialGuestCart = getGuestCart();
    setCart(initialGuestCart);
    setCartMessage(initialGuestCart.items.length ? '' : 'Hiện chưa có sản phẩm');

    getCurrentUser()
      .then(async (payload) => {
        if (!isMounted) {
          return;
        }

        setHasToken(true);
        setUser(payload.user);

        try {
          const mergedCart = await mergeGuestCartAfterAuthentication();
          const accountCart = mergedCart ?? await getCart();

          if (isMounted) {
            setCart(accountCart);
            setCartMessage(accountCart.items.length ? '' : 'Hiện chưa có sản phẩm');
          }
        } catch {
          if (isMounted) {
            void loadCartForCurrentSession();
          }
        }
      })
      .catch(() => {
        clearToken();
        if (isMounted) {
          setHasToken(false);
          setUser(null);
        }
      });

    const refreshCart = () => {
      void loadCartForCurrentSession();
    };
    const refreshGuestCart = (event: StorageEvent) => {
      if (isGuestCartStorageEvent(event)) {
        void loadCartForCurrentSession();
      }
    };

    window.addEventListener('cart-updated', refreshCart);
    window.addEventListener('storage', refreshGuestCart);

    return () => {
      isMounted = false;
      window.removeEventListener('cart-updated', refreshCart);
      window.removeEventListener('storage', refreshGuestCart);
    };
  }, []);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpenPanel(null);
      }
    }

    document.addEventListener('mousedown', closeOnOutsideClick);
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpenPanel(null);
      }
    }
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  async function openCart() {
    setOpenPanel((current) => (current === 'cart' ? null : 'cart'));
    await loadCartForCurrentSession();
  }

  async function submitLogin(formData: FormData) {
    if (isLoginSubmitting) {
      return;
    }

    setIsLoginSubmitting(true);
    setAccountMessage('Đang đăng nhập...');

    try {
      const payload = await authenticate('login', {
        email: String(formData.get('email') ?? ''),
        password: String(formData.get('password') ?? '')
      });
      setUser(payload.user);
      setHasToken(true);
      setAccountMessage('');

      try {
        const mergedCart = await mergeGuestCartAfterAuthentication();
        const accountCart = mergedCart ?? await getCart();
        setCart(accountCart);
        setCartMessage(accountCart.items.length ? '' : 'Hiện chưa có sản phẩm');
      } catch {
        void loadCartForCurrentSession();
      }
    } catch (error) {
      setAccountMessage(error instanceof Error ? error.message : 'Không đăng nhập được.');
    } finally {
      setIsLoginSubmitting(false);
    }
  }

  function logout() {
    clearGuestCart(false);
    clearToken();
    setHasToken(false);
    setUser(null);
    setCart(getGuestCart());
    setOpenPanel(null);
    setAccountMessage('Đã đăng xuất.');
  }

  const cartCount = cart?.items.reduce((total, item) => total + item.quantity, 0) ?? 0;
  const displayName = getDisplayName(user);

  return (
    <div className="header-actions" ref={wrapperRef}>
      <button
        className={`header-icon-button account-trigger${hasToken ? ' account-trigger--signed-in' : ''}`}
        type="button"
        aria-expanded={openPanel === 'account'}
        aria-controls="account-popover"
        aria-label="Tài khoản"
        onClick={() => setOpenPanel((current) => (current === 'account' ? null : 'account'))}
      >
        <span className="account-trigger-copy">
          <small>Tài khoản</small>
          <strong>{hasToken ? displayName : 'Đăng nhập'}</strong>
        </span>
        {hasToken ? <i aria-hidden="true" /> : null}
      </button>

      <button className="header-icon-button cart-trigger" type="button" aria-expanded={openPanel === 'cart'} aria-controls="cart-popover" aria-label="Giỏ hàng" onClick={openCart}>
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="M3.5 4.8h2.2l2.1 10.5h9.9l2-7.2H7.2" />
          <circle cx="9.6" cy="20" r="1.4" />
          <circle cx="17.2" cy="20" r="1.4" />
        </svg>
        <i aria-live="polite">{cartCount}</i>
        <span>Giỏ hàng</span>
      </button>

      {openPanel === 'cart' ? (
        <div className="nav-popover cart-popover" id="cart-popover" role="dialog" aria-label="Tóm tắt giỏ hàng">
          <h2>GIỎ HÀNG</h2>
          <div className="popover-divider" />
          {cart?.items.length ? (
            <div className="mini-cart-list">
              {cart.items.map((item) => (
                <article key={item.id}>
                  <strong>{item.product.name}</strong>
                  <span>
                    {item.quantity} x {formatPrice(item.unitPrice)}
                  </span>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-cart-state">
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M3.5 4.8h2.2l2.1 10.5h9.9l2-7.2H7.2" />
                <circle cx="9.6" cy="20" r="1.4" />
                <circle cx="17.2" cy="20" r="1.4" />
              </svg>
              <p>{cartMessage}</p>
            </div>
          )}
          <div className="mini-cart-total">
            <span>TỔNG TIỀN:</span>
            <strong>{formatPrice(cart?.subtotal)}</strong>
          </div>
          <a className="popover-primary" href="/cart">
            XEM GIỎ HÀNG
          </a>
        </div>
      ) : null}

      {openPanel === 'account' ? (
        <div className="nav-popover account-popover" id="account-popover" role="dialog" aria-label="Tài khoản">
          {hasToken ? (
            <div className="account-menu">
              <h2>THÔNG TIN TÀI KHOẢN</h2>
              <div className="popover-divider" />
              <strong className="account-menu-name">{displayName}</strong>
              <a href="/account">Tài khoản của tôi</a>
              <a href="/account/addresses">Danh sách địa chỉ</a>
              <a href="/account/orders">Đơn hàng của tôi</a>
              <a href="/account/notifications">Thông báo</a>
              <button type="button" onClick={logout}>
                Đăng xuất
              </button>
            </div>
          ) : (
            <form className="account-login-form" action={submitLogin}>
              <h2>ĐĂNG NHẬP TÀI KHOẢN</h2>
              <p>Nhập email và mật khẩu của bạn:</p>
              <input name="email" type="email" placeholder="Email" aria-label="Email" autoComplete="email" required />
              <input name="password" type="password" placeholder="Mật khẩu" aria-label="Mật khẩu" autoComplete="current-password" required />
              <small>Thông tin đăng nhập được dùng để quản lý giỏ hàng, đơn hàng và thông tin nhận hàng.</small>
              <button type="submit" disabled={isLoginSubmitting}>
                {isLoginSubmitting ? 'ĐANG ĐĂNG NHẬP...' : 'ĐĂNG NHẬP'}
              </button>
              <a href="/register">Khách hàng mới? Tạo tài khoản</a>
              <a href="/login">Quên mật khẩu? Khôi phục mật khẩu</a>
              {accountMessage ? <p role="status" aria-live="polite">{accountMessage}</p> : null}
            </form>
          )}
        </div>
      ) : null}
    </div>
  );
}
