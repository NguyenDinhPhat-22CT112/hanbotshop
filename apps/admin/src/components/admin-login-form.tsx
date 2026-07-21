'use client';

import { useState } from 'react';
import { adminLogin } from '../lib/browser-api';

export function AdminLoginForm() {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(formData: FormData) {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setMessage('Đang đăng nhập...');

    try {
      const payload = await adminLogin(String(formData.get('email') ?? ''), String(formData.get('password') ?? ''));
      setMessage(`Đã đăng nhập với tài khoản ${payload.user.email}`);
      window.location.href = '/';
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không đăng nhập được.');
      setIsSubmitting(false);
    }
  }

  return (
    <form className="admin-form" action={submit}>
      <label>
        Email
        <input name="email" type="email" autoComplete="username" required />
      </label>
      <label>
        Mật khẩu
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
      </button>
      {message ? <p role="status" aria-live="polite">{message}</p> : null}
    </form>
  );
}
