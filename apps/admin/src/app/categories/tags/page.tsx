import Link from 'next/link';
import { TagsPanel } from '../../../components/categories/tags-panel';

export default function AdminTagsPage() {
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
        <Link href="/categories">
          <span>Danh mục</span>
          <small>Cấu trúc cha/con và vị trí hiển thị</small>
        </Link>
        <Link href="/categories/tags" aria-current="page">
          <span>Quản lý tag</span>
          <small>Tìm kiếm, thêm, sửa và xoá tag</small>
        </Link>
      </nav>
      <TagsPanel />
    </main>
  );
}
