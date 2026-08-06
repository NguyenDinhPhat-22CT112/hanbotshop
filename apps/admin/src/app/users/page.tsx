import { UsersAdminPanel } from '../../components/users/users-admin-panel';

export default function AdminUsersPage() {
  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p>Người dùng</p>
          <h1>Khách hàng & quản trị viên</h1>
          <span>Kiểm tra tài khoản khách hàng, quyền truy cập và trạng thái hoạt động.</span>
        </div>
      </header>

      <UsersAdminPanel />
    </main>
  );
}
