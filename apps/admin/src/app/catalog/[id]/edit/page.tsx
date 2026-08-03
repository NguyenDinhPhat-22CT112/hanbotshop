import { AdminProductEditor } from '../../../../components/admin-product-editor';

export default function AdminProductEditPage({ params }: { params: { id: string } }) {
  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p>Sản phẩm</p>
          <h1>Chỉnh sửa sản phẩm</h1>
          <span>Quản lý thông tin bán, category, variant, image, tag và trạng thái sản phẩm.</span>
        </div>
        <a className="secondary-button" href="/catalog">
          Quay lại
        </a>
      </header>
      <AdminProductEditor id={decodeURIComponent(params.id)} />
    </main>
  );
}
