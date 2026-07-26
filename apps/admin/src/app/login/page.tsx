import { AdminLoginForm } from '../../components/admin-login-form';

type AdminLoginPageProps = {
  searchParams?: {
    reason?: string;
  };
};

export default function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const initialMessage =
    searchParams?.reason === 'replaced'
      ? 'Tài khoản đã đăng nhập trên thiết bị khác. Phiên trên thiết bị này đã được đăng xuất sau 10 giây.'
      : searchParams?.reason === 'inactive'
        ? 'Phiên quản trị đã hết hạn do không hoạt động.'
        : '';

  return (
    <main className="admin-shell admin-login-shell" id="admin-main">
      <section className="admin-login-card">
        <header>
          <p>Quản trị</p>
          <h1>Đăng nhập admin</h1>
          <span>Chỉ tài khoản có quyền quản trị mới truy cập được khu vực này.</span>
        </header>
        <AdminLoginForm initialMessage={initialMessage} />
      </section>
    </main>
  );
}
