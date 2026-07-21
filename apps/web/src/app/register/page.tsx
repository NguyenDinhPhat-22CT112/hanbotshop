import { RegisterAuthForm } from '../../components/register-auth-form';

export default function RegisterPage() {
  return (
    <main className="register-page">
      <section className="register-section">
        <header className="register-heading">
          <h1>Tạo tài khoản</h1>
        </header>
        <RegisterAuthForm />
        <a className="register-back-link" href="/">
          <span aria-hidden="true">←</span>
          Quay lại trang chủ
        </a>
      </section>
    </main>
  );
}
