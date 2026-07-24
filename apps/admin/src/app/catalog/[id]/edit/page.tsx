import { AdminProductEditor } from '../../../../components/admin-product-editor';

export default function AdminProductEditPage({ params }: { params: { id: string } }) {
  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p>San pham</p>
          <h1>Chinh sua san pham</h1>
          <span>Quan ly thong tin ban, category, variant, image, tag va trang thai san pham.</span>
        </div>
        <a className="secondary-button" href="/catalog">
          Quay lai
        </a>
      </header>
      <AdminProductEditor id={decodeURIComponent(params.id)} />
    </main>
  );
}
