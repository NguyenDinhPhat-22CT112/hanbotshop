import './audit-logs.css';
import { AuditLogsPanel } from '../../components/audit-logs-panel';

export default function AdminAuditLogsPage() {
  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p>Bảo mật</p>
          <h1>Nhật ký hệ thống</h1>
          <span>Theo dõi các thay đổi trạng thái, thanh toán, phân quyền và thao tác quản trị quan trọng.</span>
        </div>
      </header>
      <AuditLogsPanel />
    </main>
  );
}
