import { ProductionAdminPanel } from '../../components/production-admin-panel';

export default function AdminProductionPage() {
  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p>Sản xuất</p>
          <h1>Công việc sản xuất</h1>
          <span>Theo dõi resin print, xử lý hậu kỳ, quality check và tiến độ bàn giao.</span>
        </div>
      </header>
      <ProductionAdminPanel />
    </main>
  );
}
