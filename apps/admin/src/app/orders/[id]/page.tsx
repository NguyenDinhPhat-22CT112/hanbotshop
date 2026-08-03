import { AdminOrderDetail } from '../../../components/admin-order-detail';

export default function AdminOrderDetailPage({ params }: { params: { id: string } }) {
  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p>Đơn hàng</p>
          <h1>Chi tiết đơn hàng</h1>
          <span>Theo dõi sản phẩm, thanh toán, ghi chú nội bộ, tracking và timeline của đơn.</span>
        </div>
        <a className="secondary-button" href="/orders">
          Quay lại
        </a>
      </header>
      <AdminOrderDetail id={decodeURIComponent(params.id)} />
    </main>
  );
}
