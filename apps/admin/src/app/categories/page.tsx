import { CategoriesPanel } from '../../components/categories-panel';

export default function AdminCategoriesPage() {
  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p>Catalog</p>
          <h1>Danh mục</h1>
          <span>Quản lý danh mục cha/con, đường dẫn và phạm vi hiển thị trên cửa hàng.</span>
        </div>
      </header>
      <CategoriesPanel />
    </main>
  );
}
