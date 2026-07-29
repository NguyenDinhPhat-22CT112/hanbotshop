import './orders.css';
import { OrdersAdminPanel } from '../../components/orders-admin-panel';

export default function AdminOrdersPage() {
  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p>Đơn hàng</p>
          <h1>Kiểm tra đơn hàng</h1>
          <span>Cập nhật trạng thái, thanh toán và mã vận chuyển cho từng đơn.</span>
        </div>
      </header>

      <OrdersAdminPanel />
    </main>
  );
}
