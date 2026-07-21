'use client';

import { useState } from 'react';
import { adminFetch } from '../lib/browser-api';

export function UserActionForm() {
  const [message, setMessage] = useState('');

  async function submit(formData: FormData) {
    const userId = String(formData.get('userId') ?? '').trim();
    const role = String(formData.get('role') ?? '');
    const status = String(formData.get('status') ?? '');
    setMessage('Đang cập nhật người dùng...');

    try {
      if (role) {
        await adminFetch(`/users/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ role }) });
      }
      if (status) {
        await adminFetch(`/users/${userId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      }
      window.dispatchEvent(new Event('admin:data-changed'));
      setMessage('Đã cập nhật người dùng.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không cập nhật được người dùng.');
    }
  }

  return (
    <form className="admin-form compact-form" action={submit}>
      <label>
        ID người dùng
        <input name="userId" required />
      </label>
      <label>
        Vai trò
        <select name="role" defaultValue="">
          <option value="">Không đổi</option>
          <option value="CUSTOMER">Khách hàng</option>
          <option value="ADMIN">Quản trị viên</option>
        </select>
      </label>
      <label>
        Trạng thái
        <select name="status" defaultValue="">
          <option value="">Không đổi</option>
          <option value="ACTIVE">Đang hoạt động</option>
          <option value="DISABLED">Đã khóa</option>
        </select>
      </label>
      <button type="submit">Cập nhật</button>
      {message ? <p>{message}</p> : null}
    </form>
  );
}
