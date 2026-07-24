import { ForgotPasswordForm } from '../../components/password-reset-forms';

export default function ForgotPasswordPage() {
  return (
    <main className="login-page">
      <section className="login-section">
        <header className="login-heading">
          <h1>Quên mật khẩu</h1>
        </header>
        <ForgotPasswordForm />
      </section>
    </main>
  );
}
