import { AdminUserDetail } from '../../../components/admin-user-detail';

export default function AdminUserDetailPage({ params }: { params: { id: string } }) {
  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p>Người dùng</p>
          <h1>Chi tiết người dùng</h1>
          <span>Xem hồ sơ, địa chỉ, đơn hàng gần đây và cập nhật quyền hoặc trạng thái của tài khoản.</span>
        </div>
        <a className="secondary-button" href="/users">
          Quay lại
        </a>
      </header>
      <AdminUserDetail id={decodeURIComponent(params.id)} />
    </main>
  );
}
