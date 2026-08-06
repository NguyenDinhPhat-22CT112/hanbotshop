import { AdminLoginForm } from '../../components/auth/admin-login-form';

export default function AdminLoginPage() {
  return (
    <main className="admin-shell admin-login-shell" id="admin-main">
      <section className="admin-login-card">
        <header>
          <p>Quản trị</p>
          <h1>Đăng nhập admin</h1>
          <span>Chỉ tài khoản có quyền quản trị mới truy cập được khu vực này.</span>
        </header>
        <AdminLoginForm />
      </section>
    </main>
  );
}
