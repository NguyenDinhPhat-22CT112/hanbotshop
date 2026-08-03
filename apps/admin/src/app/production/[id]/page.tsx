import { AdminProductionDetail } from '../../../components/admin-production-detail';

export default function AdminProductionDetailPage({ params }: { params: { id: string } }) {
  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p>Sản xuất</p>
          <h1>Chi tiết production job</h1>
          <span>Theo dõi timeline, events, internal notes, assignee và độ ưu tiên xử lý.</span>
        </div>
        <a className="secondary-button" href="/production">
          Quay lại
        </a>
      </header>
      <AdminProductionDetail id={decodeURIComponent(params.id)} />
    </main>
  );
}
