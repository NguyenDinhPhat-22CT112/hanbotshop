import { AdminOrderDetail } from '../../../components/admin-order-detail';

export default function AdminOrderDetailPage({ params }: { params: { id: string } }) {
  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p>Don hang</p>
          <h1>Chi tiet don hang</h1>
          <span>Theo doi san pham, thanh toan, ghi chu noi bo, tracking va timeline cua don.</span>
        </div>
        <a className="secondary-button" href="/orders">
          Quay lai
        </a>
      </header>
      <AdminOrderDetail id={decodeURIComponent(params.id)} />
    </main>
  );
}
