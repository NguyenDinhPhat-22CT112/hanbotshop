import { CategoriesPanel } from '../../components/categories-panel';

export default function AdminCategoriesPage() {
  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p>Catalog</p>
          <h1>Danh muc</h1>
          <span>Quan ly category cha/con, slug va trang thai luu tru cho catalog.</span>
        </div>
      </header>
      <CategoriesPanel />
    </main>
  );
}
