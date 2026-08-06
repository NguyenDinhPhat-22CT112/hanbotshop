import { ProductForm } from '../../../components/catalog/product-form';

export default function NewProductPage() {
  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p>Danh mục</p>
          <h1>Thêm sản phẩm</h1>
          <span>Tạo sản phẩm mới, thêm giá, trạng thái bán, tag và ảnh sản phẩm.</span>
        </div>
      </header>
      <section className="admin-panel">
        <ProductForm />
      </section>
    </main>
  );
}
