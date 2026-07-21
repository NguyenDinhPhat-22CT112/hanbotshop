import { Suspense } from 'react';
import { ResetPasswordForm } from '../../components/password-reset-forms';

export default function ResetPasswordPage() {
  return (
    <main className="login-page">
      <section className="login-section">
        <header className="login-heading">
          <h1>Đặt lại mật khẩu</h1>
        </header>
        <Suspense fallback={<p className="form-message">Đang tải...</p>}>
          <ResetPasswordForm />
        </Suspense>
      </section>
    </main>
  );
}
