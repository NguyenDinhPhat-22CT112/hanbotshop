import { CatalogAdminPanel } from '../../components/catalog-admin-panel';

export default function AdminCatalogPage() {
  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p>Danh mục</p>
          <h1>Sản phẩm</h1>
          <span>Quản lý trạng thái bán, giá, tag và hình ảnh sản phẩm.</span>
        </div>
        <a className="admin-button" href="/catalog/new">
          Thêm sản phẩm
        </a>
      </header>

      <CatalogAdminPanel />
    </main>
  );
}
