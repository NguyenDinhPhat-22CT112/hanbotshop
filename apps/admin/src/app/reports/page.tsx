import { ReportsPanel } from '../../components/reports-panel';

export default function AdminReportsPage() {
  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p>Reports</p>
          <h1>Bao cao doanh thu</h1>
          <span>So lieu tong quan cho don hang, thanh toan va cac don can doi soat.</span>
        </div>
      </header>
      <ReportsPanel />
    </main>
  );
}
