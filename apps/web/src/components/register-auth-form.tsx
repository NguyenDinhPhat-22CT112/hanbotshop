'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { authenticate } from '../lib/browser-api';
import { mergeGuestCartAfterAuthentication } from '../lib/guest-cart';
import { safeInternalPath } from '../lib/navigation';

function getRegisterName(formData: FormData) {
  return [formData.get('lastName'), formData.get('firstName')]
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)
    .join(' ');
}

export function RegisterAuthForm({ nextPath }: { nextPath?: string | null }) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(formData: FormData) {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setMessage('Đang xử lý...');

    try {
      const payload = await authenticate('register', {
        name: getRegisterName(formData),
        email: String(formData.get('email') ?? ''),
        password: String(formData.get('password') ?? '')
      });

      await mergeGuestCartAfterAuthentication().catch(() => null);
      setMessage(`Đã đăng nhập với tài khoản ${payload.user.email}`);
      router.push(safeInternalPath(nextPath, '/account'));
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không đăng ký được.');
      setIsSubmitting(false);
    }
  }

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
      <input name="password" placeholder="Mật khẩu" type="password" autoComplete="new-password" required />

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'ĐANG ĐĂNG KÝ...' : 'ĐĂNG KÝ'}
      </button>
      {message ? <p className="form-message">{message}</p> : null}
    </form>
  );
}
