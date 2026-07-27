'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { authenticate, notifyAuthSessionChanged, type AuthMode } from '../lib/browser-api';
import { mergeGuestCartAfterAuthentication } from '../lib/guest-cart';
import { safeInternalPath } from '../lib/navigation';

type AuthFormProps = {
  mode: AuthMode;
  nextPath?: string | null;
};

function getRegisterName(formData: FormData) {
  return [formData.get('lastName'), formData.get('firstName')]
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)
    .join(' ');
}

export function AuthForm({ mode, nextPath }: AuthFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isRegister = mode === 'register';

  async function submit(formData: FormData) {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setMessage('Đang xử lý...');

    try {
      const payload = await authenticate(mode, {
        email: String(formData.get('email') ?? ''),
        password: String(formData.get('password') ?? ''),
        ...(isRegister
          ? {
              name: getRegisterName(formData),
              phone: String(formData.get('phone') ?? '')
            }
          : {})
      });

      await mergeGuestCartAfterAuthentication().catch(() => null);
      notifyAuthSessionChanged();
      setMessage(`Đã đăng nhập với tài khoản ${payload.user.email}`);
      router.push(safeInternalPath(nextPath, isRegister ? '/account' : '/'));
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không đăng nhập được.');
      setIsSubmitting(false);
    }
  }

  if (isRegister) {
    return (
      <form className="register-form" action={submit}>
        <div className="register-name-grid">
          <input name="lastName" type="text" placeholder="Họ" autoComplete="family-name" required />
          <input name="firstName" type="text" placeholder="Tên" autoComplete="given-name" required />
        </div>

        <fieldset className="register-gender" aria-label="Giới tính">
          <label>
            <input name="gender" type="radio" value="female" />
            <span>Nữ</span>
          </label>
          <label>
            <input name="gender" type="radio" value="male" />
            <span>Nam</span>
          </label>
        </fieldset>

        <input name="birthday" type="text" placeholder="dd/mm/yyyy" inputMode="numeric" autoComplete="bday" />
        <input name="email" placeholder="Email" type="email" autoComplete="email" required />
        <input
          name="phone"
          placeholder="Số điện thoại"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          minLength={6}
          maxLength={32}
          required
        />
        <input name="password" placeholder="Mật khẩu" type="password" autoComplete="new-password" required />

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'ĐANG ĐĂNG KÝ...' : 'ĐĂNG KÝ'}
        </button>
        {message ? <p className="form-message">{message}</p> : null}
      </form>
    );
  }

  return (
    <form className="login-form" action={submit}>
      <input name="email" placeholder="Email" type="email" autoComplete="email" required />
      <input name="password" placeholder="Mật khẩu" type="password" autoComplete="current-password" required />

      <div className="login-form-actions">
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'ĐANG ĐĂNG NHẬP...' : 'ĐĂNG NHẬP'}
        </button>
        <div className="login-help-links">
          <a href="/forgot-password">Quên mật khẩu?</a>
          <span>
            hoặc <a href={nextPath ? `/register?next=${encodeURIComponent(safeInternalPath(nextPath, '/account'))}` : '/register'}>Đăng ký</a>
          </span>
        </div>
      </div>

      {message ? <p className="form-message">{message}</p> : null}
    </form>
  );
}
