import { AuthForm } from '../../components/auth-form';

export default function LoginPage() {
  return (
    <main className="login-page">
      <section className="login-section">
        <header className="login-heading">
          <h1>Đăng nhập</h1>
        </header>
        <AuthForm mode="login" />
        <a className="login-back-link" href="/">
          <span aria-hidden="true">←</span>
          Quay lại trang chủ
        </a>
      </section>
    </main>
  );
}
