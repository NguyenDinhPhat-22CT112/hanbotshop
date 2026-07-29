import './categories.css';
import Link from 'next/link';
import { CategoriesPanel } from '../../components/categories-panel';

export default function AdminCategoriesPage() {
  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p>Catalog</p>
          <h1>Danh mục &amp; Tag</h1>
          <span>Tổ chức danh mục và hệ thống tag dùng chung cho toàn bộ sản phẩm.</span>
        </div>
      </header>
      <nav className="catalog-taxonomy-tabs" aria-label="Quản lý phân loại sản phẩm">
        <Link href="/categories" aria-current="page">
          <span>Danh mục</span>
          <small>Cấu trúc cha/con và vị trí hiển thị</small>
        </Link>
        <Link href="/categories/tags">
          <span>Quản lý tag</span>
          <small>Tìm kiếm, thêm, sửa và xoá tag</small>
        </Link>
      </nav>
      <CategoriesPanel />
    </main>
  );
}
