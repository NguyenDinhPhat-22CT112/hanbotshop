'use client';

import { useEffect, useState } from 'react';
import { adminFetch, getAdminToken } from '../lib/browser-api';
import { labelOf } from '../lib/labels';
import { UserActionForm } from './user-action-form';

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  _count?: {
    orders: number;
  };
};

type UserResponse = {
  data: UserRow[];
};

export function UsersPanel() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [message, setMessage] = useState('Đang tải người dùng...');

  async function loadUsers() {
    if (!getAdminToken()) {
      setMessage('Vui lòng đăng nhập quản trị trước.');
      return;
    }

    try {
      const payload = await adminFetch<UserResponse>('/users?pageSize=100');
      setUsers(payload.data);
      setMessage(payload.data.length ? '' : 'Chưa có người dùng.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không tải được người dùng.');
    }
  }

  useEffect(() => {
    void loadUsers();
    window.addEventListener('admin:data-changed', loadUsers);

    return () => window.removeEventListener('admin:data-changed', loadUsers);
  }, []);

  return (
    <>
      <section className="table-panel">
        <div className="table-row users-row table-head">
          <span>Tài khoản</span>
          <span>Tên</span>
          <span>Vai trò</span>
          <span>Trạng thái</span>
          <span>Hoạt động</span>
        </div>
        {users.length ? (
          users.map((user) => (
            <div className="table-row users-row" key={user.id}>
              <strong>
                <a href={`/users/${encodeURIComponent(user.id)}`}>{user.email}</a>
                <small>{user.id}</small>
              </strong>
              <span>{user.name ?? 'Chưa cập nhật'}</span>
              <span>{labelOf(user.role)}</span>
              <span>{labelOf(user.status)}</span>
              <span>{user._count?.orders ?? 0} đơn hàng</span>
            </div>
          ))
        ) : (
          <div className="table-row users-row">
            <span>{message}</span>
          </div>
        )}
      </section>

      <section className="admin-panel">
        <h2>Cập nhật người dùng</h2>
        <UserActionForm />
      </section>
    </>
  );
}
