'use client';

import { useEffect, useState } from 'react';
import { adminCheck, adminFetch, getAdminToken } from '../lib/browser-api';
import { labelOf } from '../lib/labels';
import { buildQuery, PaginationControls, type ListMeta } from './list-pagination';

type User = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  createdAt?: string;
  _count?: { orders: number };
};

type Filters = {
  q: string;
  role: string;
  status: string;
  page: number;
  pageSize: number;
};

const defaults: Filters = { q: '', role: '', status: '', page: 1, pageSize: 20 };

export function UsersAdminPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [filters, setFilters] = useState(defaults);
  const [meta, setMeta] = useState<ListMeta | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [createFormKey, setCreateFormKey] = useState(0);
  const [message, setMessage] = useState('Đang tải người dùng...');

  async function load(next: Filters = filters) {
    if (!getAdminToken()) {
      setMessage('Vui lòng đăng nhập quản trị trước.');
      return;
    }

    try {
      const data = await adminFetch<{ data: User[]; meta: ListMeta }>(`/users?${buildQuery(next)}`);
      setUsers(data.data);
      setMeta(data.meta);
      setFilters(next);
      setMessage(data.data.length ? '' : 'Không có người dùng phù hợp.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không tải được người dùng.');
    }
  }

  useEffect(() => {
    void load(defaults);
    void adminCheck().then(({ user }) => setCurrentUserId(user.id ?? null)).catch(() => undefined);
  }, []);

  function apply(formData: FormData) {
    void load({
      q: String(formData.get('q') ?? '').trim(),
      role: String(formData.get('role') ?? ''),
      status: String(formData.get('status') ?? ''),
      page: 1,
      pageSize: Number(formData.get('pageSize') ?? 20)
    });
  }

  async function update(user: User, formData: FormData) {
    const role = String(formData.get('role') ?? user.role);
    const status = String(formData.get('status') ?? user.status);
    setMessage('Đang cập nhật người dùng...');

    try {
      if (role !== user.role) {
        await adminFetch(`/users/${user.id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) });
      }
      if (status !== user.status) {
        await adminFetch(`/users/${user.id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      }
      setEditingId(null);
      await load();
      setMessage('Đã cập nhật người dùng.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không cập nhật được người dùng.');
    }
  }

  async function toggle(user: User) {
    const disabling = user.status === 'ACTIVE';
    if (!window.confirm(`${disabling ? 'Khóa' : 'Mở khóa'} tài khoản “${user.email}”?${disabling ? ' Người dùng sẽ không thể đăng nhập.' : ''}`)) {
      return;
    }

    try {
      await adminFetch(`/users/${user.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: disabling ? 'DISABLED' : 'ACTIVE' })
      });
      await load();
      setMessage(disabling ? 'Đã khóa tài khoản.' : 'Đã mở khóa tài khoản.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không cập nhật được tài khoản.');
    }
  }

  async function create(formData: FormData) {
    const password = String(formData.get('password') ?? '');
    const passwordConfirmation = String(formData.get('passwordConfirmation') ?? '');

    if (password !== passwordConfirmation) {
      setMessage('Xác nhận mật khẩu chưa khớp.');
      return;
    }

    setMessage('Đang tạo tài khoản...');

    try {
      await adminFetch('/users', {
        method: 'POST',
        body: JSON.stringify({
          name: String(formData.get('name') ?? '').trim() || null,
          email: String(formData.get('email') ?? '').trim(),
          phone: String(formData.get('phone') ?? '').trim() || null,
          password,
          role: String(formData.get('role') ?? 'CUSTOMER'),
          status: String(formData.get('status') ?? 'ACTIVE')
        })
      });
      setCreateFormKey((value) => value + 1);
      setShowCreatePassword(false);
      await load({ ...filters, page: 1 });
      setMessage('Đã tạo tài khoản mới.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không tạo được tài khoản.');
    }
  }

  async function remove(user: User) {
    if (user.id === currentUserId) {
      return;
    }
    if (!window.confirm(`Xóa vĩnh viễn tài khoản “${user.email}”?\n\nThao tác này không thể hoàn tác. Tài khoản đã có đơn hàng sẽ không thể xóa và cần được khóa thay thế.`)) {
      return;
    }

    setMessage('Đang xóa tài khoản...');
    try {
      await adminFetch(`/users/${user.id}`, { method: 'DELETE' });
      await load();
      setMessage('Đã xóa tài khoản.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không xóa được tài khoản.');
    }
  }

  return (
    <div className="users-workspace">
      <div className="users-main-column detail-stack">
        <div className="management-toolbar">
          <div>
            <strong>Quản lý tài khoản</strong>
            <span>Tìm kiếm, phân quyền và theo dõi trạng thái khách hàng hoặc quản trị viên.</span>
          </div>
          {meta ? <small className="users-total-count">{meta.total} tài khoản</small> : null}
        </div>

        <section className="admin-panel filter-panel">
          <div className="filter-title">
            <div>
              <strong>Bộ lọc người dùng</strong>
              <span>Lọc nhanh danh sách theo tên, email, quyền và trạng thái.</span>
            </div>
          </div>
          <form className="admin-form filter-form users-filter" action={apply}>
            <label className="search-field">
              <span>Tìm kiếm</span>
              <div><b>⌕</b><input name="q" defaultValue={filters.q} placeholder="Tên, email hoặc số điện thoại..." /></div>
            </label>
            <label><span>Vai trò</span><select name="role" defaultValue={filters.role}><option value="">Tất cả vai trò</option><option value="CUSTOMER">Khách hàng</option><option value="ADMIN">Quản trị viên</option></select></label>
            <label><span>Trạng thái</span><select name="status" defaultValue={filters.status}><option value="">Tất cả trạng thái</option><option value="ACTIVE">Đang hoạt động</option><option value="DISABLED">Đã khóa</option></select></label>
            <label className="page-size"><span>Hiển thị</span><select name="pageSize" defaultValue={filters.pageSize}><option>10</option><option>20</option><option>50</option><option>100</option></select></label>
            <button type="submit">Áp dụng</button>
          </form>
        </section>

        <section className="table-panel users-table">
          <div className="table-row users-management-row table-head"><span>Người dùng</span><span>Vai trò</span><span>Trạng thái</span><span>Đơn hàng</span><span>Hành động</span></div>
          {users.map((user) => editingId === user.id ? (
            <form className="table-row user-edit-row" action={(formData) => void update(user, formData)} key={user.id}>
              <div className="user-cell"><i className="user-avatar">{initials(user)}</i><strong>{user.name || 'Chưa cập nhật tên'}<small>{user.email}</small></strong></div>
              <label>Vai trò<select name="role" defaultValue={user.role}><option value="CUSTOMER">Khách hàng</option><option value="ADMIN">Quản trị viên</option></select></label>
              <label>Trạng thái<select name="status" defaultValue={user.status}><option value="ACTIVE">Đang hoạt động</option><option value="DISABLED">Đã khóa</option></select></label>
              <span>{user._count?.orders ?? 0} đơn hàng</span>
              <span className="row-actions"><button type="submit">Lưu</button><button type="button" className="secondary-button" onClick={() => setEditingId(null)}>Hủy</button></span>
            </form>
          ) : (
            <div className="table-row users-management-row" key={user.id}>
              <div className="user-cell"><i className="user-avatar">{initials(user)}</i><strong><a href={`/users/${encodeURIComponent(user.id)}`}>{user.name || 'Chưa cập nhật tên'}</a><small>{user.email}{user.id === currentUserId ? ' · Bạn' : ''}</small></strong></div>
              <span><i className={`role-chip role-${user.role.toLowerCase()}`}>{labelOf(user.role)}</i></span>
              <span><i className={`status-chip status-${user.status.toLowerCase()}`}>{labelOf(user.status)}</i></span>
              <span className="order-count"><b>{user._count?.orders ?? 0}</b> đơn hàng</span>
              <span className="action-cell"><details><summary>Hành động <b>⌄</b></summary><div><a href={`/users/${encodeURIComponent(user.id)}`}>Xem chi tiết</a><button type="button" disabled={user.id === currentUserId} onClick={() => setEditingId(user.id)}>Chỉnh sửa quyền</button><button type="button" disabled={user.id === currentUserId} className={user.status === 'ACTIVE' ? 'danger-menu-item' : ''} onClick={() => void toggle(user)}>{user.status === 'ACTIVE' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}</button><button type="button" disabled={user.id === currentUserId} className="danger-menu-item" onClick={() => void remove(user)}>Xóa người dùng</button></div></details></span>
            </div>
          ))}
          {message ? <p className="admin-message table-message">{message}</p> : null}
        </section>
        <PaginationControls meta={meta} onPageChange={(page) => void load({ ...filters, page })} />
      </div>

      <aside className="admin-panel user-create-card" aria-labelledby="create-user-heading">
        <div className="user-create-heading">
          <span aria-hidden="true">＋</span>
          <div><strong id="create-user-heading">Tạo tài khoản</strong><small>Tạo khách hàng hoặc quản trị viên mới.</small></div>
        </div>
        <form className="admin-form user-create-form" action={create} key={createFormKey}>
          <label>Họ và tên<input name="name" placeholder="Nguyễn Văn A" required /></label>
          <label>Email<input name="email" type="email" placeholder="user@example.com" autoComplete="off" required /></label>
          <label>Số điện thoại<input name="phone" type="tel" inputMode="tel" placeholder="09xxxxxxxx" /></label>
          <label className="password-input-field">
            Mật khẩu ban đầu
            <div><input name="password" type={showCreatePassword ? 'text' : 'password'} minLength={8} placeholder="Tối thiểu 8 ký tự" autoComplete="new-password" required /><button type="button" onClick={() => setShowCreatePassword((value) => !value)} aria-label={showCreatePassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>{showCreatePassword ? 'Ẩn' : 'Hiện'}</button></div>
          </label>
          <label>Xác nhận mật khẩu<input name="passwordConfirmation" type={showCreatePassword ? 'text' : 'password'} minLength={8} placeholder="Nhập lại mật khẩu" autoComplete="new-password" required /></label>
          <label>Vai trò<select name="role" defaultValue="CUSTOMER"><option value="CUSTOMER">Khách hàng</option><option value="ADMIN">Quản trị viên</option></select></label>
          <label>Trạng thái<select name="status" defaultValue="ACTIVE"><option value="ACTIVE">Đang hoạt động</option><option value="DISABLED">Đã khóa</option></select></label>
          <p className="password-security-note">Mật khẩu chỉ có thể hiện trong lúc nhập. Sau khi tạo, hệ thống không lưu bản đọc được của mật khẩu.</p>
          <button type="submit">Tạo tài khoản</button>
        </form>
      </aside>
    </div>
  );
}

function initials(user: User) {
  return (user.name || user.email).split(/\s+/).slice(0, 2).map((value) => value[0]).join('').toUpperCase();
}
