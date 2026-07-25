import { AuthForm } from '../../components/auth-form';

type LoginPageProps = {
  searchParams?: {
    next?: string | string[];
  };
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  const nextPath = typeof searchParams?.next === 'string' ? searchParams.next : null;

  return (
    <main className="login-page">
      <section className="login-section">
        <header className="login-heading">
          <h1>Đăng nhập</h1>
        </header>
        <AuthForm mode="login" nextPath={nextPath} />
        <a className="login-back-link" href="/">
          <span aria-hidden="true">←</span>
          Quay lại trang chủ
        </a>
      </section>
    </main>
  );
}
