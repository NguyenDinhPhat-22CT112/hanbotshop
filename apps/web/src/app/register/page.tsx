import { RegisterAuthForm } from '../../components/register-auth-form';

type RegisterPageProps = {
  searchParams?: {
    next?: string | string[];
  };
};

export default function RegisterPage({ searchParams }: RegisterPageProps) {
  const nextPath = typeof searchParams?.next === 'string' ? searchParams.next : null;

  return (
    <main className="register-page">
      <section className="register-section">
        <header className="register-heading">
          <h1>Tạo tài khoản</h1>
        </header>
        <RegisterAuthForm nextPath={nextPath} />
        <a className="register-back-link" href="/">
          <span aria-hidden="true">←</span>
          Quay lại trang chủ
        </a>
      </section>
    </main>
  );
}
