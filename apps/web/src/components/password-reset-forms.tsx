'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { requestPasswordReset, resetPassword } from '../lib/browser-api';

export function ForgotPasswordForm() {
  const [message, setMessage] = useState('');
  const [resetUrl, setResetUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(formData: FormData) {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setMessage('Đang xử lý...');
    setResetUrl('');

    try {
      const payload = await requestPasswordReset(String(formData.get('email') ?? ''));
      setMessage(payload.message);
      setResetUrl(payload.resetUrl ?? '');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không gửi được yêu cầu đặt lại mật khẩu.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="login-form password-reset-form" action={submit}>
      <p className="password-reset-copy">Nhập email tài khoản, shop sẽ gửi hướng dẫn đặt lại mật khẩu.</p>
      <input name="email" placeholder="Email" type="email" autoComplete="email" required />
      <div className="login-form-actions">
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'ĐANG GỬI...' : 'GỬI HƯỚNG DẪN'}
        </button>
        <div className="login-help-links">
          <a href="/login">Quay lại đăng nhập</a>
        </div>
      </div>
      {message ? <p className="form-message">{message}</p> : null}
      {resetUrl ? (
        <p className="password-reset-dev-link">
          Link test dev: <a href={resetUrl}>Đặt lại mật khẩu</a>
        </p>
      ) : null}
    </form>
  );
}

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [message, setMessage] = useState(token ? '' : 'Link đặt lại mật khẩu không hợp lệ.');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(formData: FormData) {
    if (isSubmitting || !token) {
      return;
    }

    const password = String(formData.get('password') ?? '');
    const confirmPassword = String(formData.get('confirmPassword') ?? '');

    if (password !== confirmPassword) {
      setMessage('Mật khẩu nhập lại chưa khớp.');
      return;
    }

    setIsSubmitting(true);
    setMessage('Đang đặt lại mật khẩu...');

    try {
      await resetPassword(token, password);
      setMessage('Đã đặt lại mật khẩu.');
      router.push('/account');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không đặt lại được mật khẩu.');
      setIsSubmitting(false);
    }
  }

  return (
    <form className="login-form password-reset-form" action={submit}>
      <input name="password" placeholder="Mật khẩu mới" type="password" autoComplete="new-password" minLength={8} required disabled={!token} />
      <input name="confirmPassword" placeholder="Nhập lại mật khẩu mới" type="password" autoComplete="new-password" minLength={8} required disabled={!token} />
      <div className="login-form-actions">
        <button type="submit" disabled={isSubmitting || !token}>
          {isSubmitting ? 'ĐANG CẬP NHẬT...' : 'ĐẶT LẠI MẬT KHẨU'}
        </button>
        <div className="login-help-links">
          <a href="/login">Quay lại đăng nhập</a>
        </div>
      </div>
      {message ? <p className="form-message">{message}</p> : null}
    </form>
  );
}
