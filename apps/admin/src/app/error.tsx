'use client';
export default function AdminError({ reset }: { error: Error; reset: () => void }) { return <main className="admin-shell state-page" role="alert"><h1>Không tải được dữ liệu</h1><p>Phiên có thể đã hết hạn hoặc API đang tạm thời gián đoạn.</p><button type="button" onClick={reset}>Thử lại</button></main>; }
