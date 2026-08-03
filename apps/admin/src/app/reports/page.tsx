import { ReportsPanel } from '../../components/reports-panel';
import './reports.css';

export default function AdminReportsPage() {
  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p>Reports</p>
          <h1>Báo cáo doanh thu</h1>
          <span>Số liệu tổng quan cho đơn hàng, thanh toán và các đơn cần đối soát.</span>
        </div>
      </header>
      <ReportsPanel />
    </main>
  );
}
