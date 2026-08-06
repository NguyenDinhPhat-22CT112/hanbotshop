'use client';

import { useEffect, useState } from 'react';
import { adminFetch, getAdminToken } from '../../lib/browser-api';
import { labelOf } from '../../lib/labels';
import { formatAddress, formatDateTime, formatPrice } from '../../lib/format';

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
  const [message, setMessage] = useState('Dang tai nguoi dung...');

  async function loadUser() {
    if (!getAdminToken()) {
      setMessage('Vui long dang nhap quan tri truoc.');
      return;
    }

    try {
      const payload = await adminFetch<UserDetail>(`/users/${encodeURIComponent(id)}`);
      setUser(payload);
      setMessage('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Khong tai duoc nguoi dung.');
    }
  }

  useEffect(() => {
    void loadUser();
  }, [id]);

  async function updateUser(formData: FormData) {
    const role = String(formData.get('role') ?? '');
    const status = String(formData.get('status') ?? '');
    setMessage('Dang cap nhat nguoi dung...');

    try {
      if (role) {
        await adminFetch(`/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) });
      }

      if (status) {
        await adminFetch(`/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      }

      await loadUser();
      setMessage('Da cap nhat nguoi dung.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Khong cap nhat duoc nguoi dung.');
    }
  }

  if (!user) {
    return <p className="admin-message">{message}</p>;
  }

  return (
    <div className="detail-stack">
      <section className="admin-panel detail-grid">
        <div>
          <h2>Thong tin tai khoan</h2>
          <dl className="detail-list">
            <div>
              <dt>Email</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt>Ten</dt>
              <dd>{user.name ?? '-'}</dd>
            </div>
            <div>
              <dt>Dien thoai</dt>
              <dd>{user.phone ?? '-'}</dd>
            </div>
            <div>
              <dt>Ngay tao</dt>
              <dd>{formatDateTime(user.createdAt)}</dd>
            </div>
          </dl>
        </div>
        <div>
          <h2>Phan quyen</h2>
          <form className="admin-form" action={updateUser}>
            <label>
              Role
              <select name="role" defaultValue={user.role}>
                {roles.map((role) => (
                  <option value={role} key={role}>
                    {labelOf(role)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Status
              <select name="status" defaultValue={user.status}>
                {statuses.map((status) => (
                  <option value={status} key={status}>
                    {labelOf(status)}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit">Luu nguoi dung</button>
          </form>
        </div>
      </section>

      <section className="table-panel">
        <div className="table-row user-order-row table-head">
          <span>Don hang</span>
          <span>Status</span>
          <span>Payment</span>
          <span>Tong tien</span>
          <span>Ngay tao</span>
        </div>
        {user.orders.map((order) => (
          <a className="table-row user-order-row table-link-row" href={`/orders/${order.id}`} key={order.id}>
            <strong>{order.orderNumber}</strong>
            <span>{labelOf(order.status)}</span>
            <span>{labelOf(order.paymentStatus)}</span>
            <span>{formatPrice(order.total)}</span>
            <span>{formatDateTime(order.createdAt)}</span>
          </a>
        ))}
      </section>

      <section className="admin-panel">
        <h2>Dia chi</h2>
        <div className="detail-card-grid">
          {user.addresses.map((address) => (
            <article key={address.id}>
              <strong>
                {address.recipient}
                {address.isDefault ? ' / Default' : ''}
              </strong>
              <span>{address.phone}</span>
              <p>{formatAddress(address)}</p>
            </article>
          ))}
          {!user.addresses.length ? <p>Chua co dia chi.</p> : null}
        </div>
      </section>

      {message ? <p className="admin-message">{message}</p> : null}
    </div>
  );
}
