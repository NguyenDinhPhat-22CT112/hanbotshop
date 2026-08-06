import Link from 'next/link';
import { CategoriesPanel } from '../../components/categories/categories-panel';
import { TagsPanel } from '../../components/categories/tags-panel';

export default function AdminCategoriesPage({
  searchParams
}: {
  searchParams?: { tab?: string };
}) {
  const activeTab = searchParams?.tab === 'tags' ? 'tags' : 'categories';

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
        <Link href="/categories" aria-current={activeTab === 'categories' ? 'page' : undefined}>
          <span>Danh mục</span>
          <small>Cấu trúc cha/con và vị trí hiển thị</small>
        </Link>
        <Link href="/categories?tab=tags" aria-current={activeTab === 'tags' ? 'page' : undefined}>
          <span>Quản lý tag</span>
          <small>Tìm kiếm, thêm, sửa và xoá tag</small>
        </Link>
      </nav>
      {activeTab === 'tags' ? <TagsPanel /> : <CategoriesPanel />}
    </main>
  );
}
