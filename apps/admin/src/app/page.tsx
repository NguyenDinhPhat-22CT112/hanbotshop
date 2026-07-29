import './page.css';
import { DashboardPanel } from '../components/dashboard-panel';

export default function AdminHomePage() {
  return (
    <main className="admin-shell">
      <header className="admin-hero">
        <p>Vận hành</p>
        <h1>Quản trị Hanbotorder</h1>
        <span>Theo dõi sản phẩm, đơn hàng, khách hàng và tiến độ xử lý tại một nơi.</span>
      </header>
      <DashboardPanel />
      <nav className="admin-links" aria-label="Khu vực quản trị">
        <a href="/users">Người dùng</a>
        <a href="/catalog">Sản phẩm</a>
        <a href="/orders">Đơn hàng</a>
        <a href="/production">Sản xuất</a>
      </nav>
    </main>
  );
}
