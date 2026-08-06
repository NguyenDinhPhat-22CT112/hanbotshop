import { MediaPanel } from '../../components/media/media-panel';

export default function AdminMediaPage() {
  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p>Thư viện</p>
          <h1>Quản lý Media</h1>
          <span>Tải ảnh và tài liệu lên kho lưu trữ, kiểm tra trạng thái và sử dụng lại trong catalog.</span>
        </div>
      </header>
      <MediaPanel />
    </main>
  );
}
