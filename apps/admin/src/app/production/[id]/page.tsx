import { AdminProductionDetail } from '../../../components/admin-production-detail';

export default function AdminProductionDetailPage({ params }: { params: { id: string } }) {
  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p>San xuat</p>
          <h1>Chi tiet production job</h1>
          <span>Theo doi timeline, events, internal notes, assignee va do uu tien xu ly.</span>
        </div>
        <a className="secondary-button" href="/production">
          Quay lai
        </a>
      </header>
      <AdminProductionDetail id={decodeURIComponent(params.id)} />
    </main>
  );
}
