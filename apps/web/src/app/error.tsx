'use client';
import { useEffect } from 'react';
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <main className="state-page" role="alert"><span className="state-code">Đã có lỗi</span><h1>Trang chưa thể hiển thị</h1><p>Vui lòng thử lại. Nếu lỗi tiếp tục xảy ra, hãy liên hệ shop.</p><div className="state-actions"><button type="button" onClick={reset}>Thử lại</button><a href="/">Về trang chủ</a></div></main>;
}
