import { AdminUserDetail } from '../../../components/users/admin-user-detail';

export default function AdminUserDetailPage({ params }: { params: { id: string } }) {
  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p>Nguoi dung</p>
          <h1>Chi tiet nguoi dung</h1>
          <span>Xem ho so, dia chi, don hang gan day va cap nhat role/status cua tai khoan.</span>
        </div>
        <a className="secondary-button" href="/users">
          Quay lai
        </a>
      </header>
      <AdminUserDetail id={decodeURIComponent(params.id)} />
    </main>
  );
}
