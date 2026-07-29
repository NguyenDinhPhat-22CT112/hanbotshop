'use client';

import { useEffect, useState } from 'react';
import { adminFetch, getAdminToken } from '../lib/browser-api';
import { labelOf } from '../lib/labels';
import { formatAddress, formatDateTime, formatPrice } from './admin-format';

type UserDetail = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  addresses: Array<{
    id: string;
    recipient: string;
    phone: string;
    line1: string;
    line2?: string | null;
    city: string;
    province?: string | null;
    postalCode?: string | null;
    countryCode: string;
    isDefault: boolean;
  }>;
  orders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    total: string;
    createdAt: string;
  }>;
};

const roles = ['CUSTOMER', 'ADMIN'];
const statuses = ['ACTIVE', 'DISABLED'];

export function AdminUserDetail({ id }: { id: string }) {
  const [user, setUser] = useState<UserDetail | null>(null);
  const [message, setMessage] = useState('Đang tải người dùng...');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordFormKey, setPasswordFormKey] = useState(0);

  async function loadUser() {
    if (!getAdminToken()) {
      setMessage('Vui lòng đăng nhập quản trị trước.');
      return;
    }

    try {
      const payload = await adminFetch<UserDetail>(`/users/${encodeURIComponent(id)}`);
      setUser(payload);
      setMessage('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không tải được người dùng.');
    }
  }

  useEffect(() => {
    void loadUser();
  }, [id]);

  async function updateUser(formData: FormData) {
    const role = String(formData.get('role') ?? '');
    const status = String(formData.get('status') ?? '');
    setMessage('Đang cập nhật người dùng...');

    try {
      if (role) {
        await adminFetch(`/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) });
      }
      if (status) {
        await adminFetch(`/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      }
      await loadUser();
      setMessage('Đã cập nhật người dùng.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không cập nhật được người dùng.');
    }
  }

  async function setNewPassword(formData: FormData) {
    const password = String(formData.get('password') ?? '');
    const confirmation = String(formData.get('passwordConfirmation') ?? '');

    if (password !== confirmation) {
      setMessage('Xác nhận mật khẩu mới chưa khớp.');
      return;
    }
    if (!window.confirm('Đặt mật khẩu mới cho tài khoản này? Mật khẩu cũ sẽ không còn dùng được.')) {
      return;
    }

    setMessage('Đang đặt mật khẩu mới...');
    try {
      await adminFetch(`/users/${id}/password`, { method: 'PATCH', body: JSON.stringify({ password }) });
      setPasswordFormKey((value) => value + 1);
      setShowNewPassword(false);
      setMessage('Đã đặt mật khẩu mới.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể đặt mật khẩu mới.');
    }
  }

  if (!user) {
    return <p className="admin-message">{message}</p>;
  }

  return (
    <div className="detail-stack">
      <section className="admin-panel detail-grid">
        <div>
          <h2>Thông tin tài khoản</h2>
          <dl className="detail-list">
            <div><dt>Email</dt><dd>{user.email}</dd></div>
            <div><dt>Họ và tên</dt><dd>{user.name ?? 'Chưa cập nhật'}</dd></div>
            <div><dt>Số điện thoại</dt><dd>{user.phone ?? 'Chưa cập nhật'}</dd></div>
            <div><dt>Ngày tạo</dt><dd>{formatDateTime(user.createdAt)}</dd></div>
            <div><dt>Cập nhật lần cuối</dt><dd>{formatDateTime(user.updatedAt)}</dd></div>
          </dl>
        </div>

        <div className="user-account-controls">
          <div>
            <h2>Phân quyền</h2>
            <form className="admin-form" action={updateUser}>
              <label>Vai trò<select name="role" defaultValue={user.role}>{roles.map((role) => <option value={role} key={role}>{labelOf(role)}</option>)}</select></label>
              <label>Trạng thái<select name="status" defaultValue={user.status}>{statuses.map((status) => <option value={status} key={status}>{labelOf(status)}</option>)}</select></label>
              <button type="submit">Lưu thay đổi</button>
            </form>
          </div>

          <section className="user-password-reset" aria-labelledby="user-password-heading">
            <div><strong id="user-password-heading">Mật khẩu</strong><span>Mật khẩu hiện tại không thể xem lại. Bạn chỉ có thể đặt mật khẩu mới.</span></div>
            <form className="admin-form" action={setNewPassword} key={passwordFormKey}>
              <label className="password-input-field">
                Mật khẩu mới
                <div><input name="password" type={showNewPassword ? 'text' : 'password'} minLength={8} autoComplete="new-password" required /><button type="button" onClick={() => setShowNewPassword((value) => !value)}>{showNewPassword ? 'Ẩn' : 'Hiện'}</button></div>
              </label>
              <label>Xác nhận mật khẩu mới<input name="passwordConfirmation" type={showNewPassword ? 'text' : 'password'} minLength={8} autoComplete="new-password" required /></label>
              <button type="submit" className="secondary-button">Đặt mật khẩu mới</button>
            </form>
          </section>
        </div>
      </section>

      <section className="table-panel">
        <div className="table-row user-order-row table-head"><span>Đơn hàng</span><span>Trạng thái</span><span>Thanh toán</span><span>Tổng tiền</span><span>Ngày tạo</span></div>
        {user.orders.map((order) => (
          <a className="table-row user-order-row table-link-row" href={`/orders/${order.id}`} key={order.id}>
            <strong>{order.orderNumber}</strong><span>{labelOf(order.status)}</span><span>{labelOf(order.paymentStatus)}</span><span>{formatPrice(order.total)}</span><span>{formatDateTime(order.createdAt)}</span>
          </a>
        ))}
        {!user.orders.length ? <p className="admin-message table-message">Người dùng này chưa có đơn hàng.</p> : null}
      </section>

      <section className="admin-panel">
        <h2>Địa chỉ</h2>
        <div className="detail-card-grid">
          {user.addresses.map((address) => (
            <article key={address.id}>
              <strong>{address.recipient}{address.isDefault ? ' · Mặc định' : ''}</strong>
              <span>{address.phone}</span><p>{formatAddress(address)}</p>
            </article>
          ))}
          {!user.addresses.length ? <p>Chưa có địa chỉ lưu.</p> : null}
        </div>
      </section>

      {message ? <p className="admin-message">{message}</p> : null}
    </div>
  );
}
