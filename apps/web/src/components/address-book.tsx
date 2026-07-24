'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/browser-api';

type Address = {
  id: string;
  recipient: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  province: string | null;
  postalCode: string | null;
  countryCode: string;
  isDefault: boolean;
};

type AddressResponse = {
  data: Address[];
};

type AddressFormMode =
  | { type: 'create' }
  | {
      type: 'edit';
      address: Address;
    };

function formValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim();
}

function mapAddressForm(formData: FormData) {
  return {
    recipient: [formValue(formData, 'lastName'), formValue(formData, 'firstName')].filter(Boolean).join(' '),
    phone: formValue(formData, 'phone'),
    line1: formValue(formData, 'line1'),
    line2: formValue(formData, 'line2') || null,
    city: formValue(formData, 'city'),
    province: formValue(formData, 'province') || null,
    postalCode: formValue(formData, 'postalCode') || null,
    countryCode: 'VN',
    isDefault: formData.get('isDefault') === 'on'
  };
}

function splitRecipient(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length <= 1) {
    return { lastName: name, firstName: '' };
  }

  return {
    lastName: parts.slice(0, -1).join(' '),
    firstName: parts.at(-1) ?? ''
  };
}

function formatAddress(address: Address) {
  return [address.line1, address.line2, address.city, address.province, address.countryCode].filter(Boolean).join(', ');
}

export function AddressBook() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [message, setMessage] = useState('Đang tải địa chỉ...');
  const [formMode, setFormMode] = useState<AddressFormMode | null>(null);

  async function loadAddresses() {
    try {
      const payload = await apiFetch<AddressResponse>('/users/me/addresses');
      setAddresses(payload.data);
      setMessage(payload.data.length ? '' : 'Bạn chưa có địa chỉ nào.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Vui lòng đăng nhập trước.');
    }
  }

  useEffect(() => {
    void loadAddresses();
  }, []);

  async function submitAddress(formData: FormData) {
    const payload = mapAddressForm(formData);
    setMessage(formMode?.type === 'edit' ? 'Đang cập nhật địa chỉ...' : 'Đang lưu địa chỉ...');

    try {
      if (formMode?.type === 'edit') {
        await apiFetch(`/users/me/addresses/${formMode.address.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload)
        });
      } else {
        await apiFetch('/users/me/addresses', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }

      await loadAddresses();
      setFormMode(null);
      setMessage(formMode?.type === 'edit' ? 'Đã cập nhật địa chỉ.' : 'Đã lưu địa chỉ.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không lưu được địa chỉ.');
    }
  }

  async function deleteAddress(id: string) {
    setMessage('Đang xóa địa chỉ...');

    try {
      await apiFetch(`/users/me/addresses/${id}`, { method: 'DELETE' });
      await loadAddresses();
      setMessage('Đã xóa địa chỉ.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không xóa được địa chỉ.');
    }
  }

  async function setDefaultAddress(address: Address) {
    setMessage('Đang đặt địa chỉ mặc định...');

    try {
      await apiFetch(`/users/me/addresses/${address.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isDefault: true })
      });
      await loadAddresses();
      setMessage('Đã đặt làm địa chỉ mặc định.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không cập nhật được địa chỉ.');
    }
  }

  return (
    <main className="account-address-page">
      <header className="account-address-heading">
        <h1>Thông tin địa chỉ</h1>
      </header>

      <section className="account-address-layout">
        <aside className="account-side-nav" aria-label="Tài khoản">
          <h2>TÀI KHOẢN</h2>
          <a href="/account">Thông tin tài khoản</a>
          <a href="/account/addresses" aria-current="page">
            Danh sách địa chỉ
          </a>
          <button
            type="button"
            onClick={() => {
              window.location.href = '/';
            }}
          >
            Đăng xuất
          </button>
        </aside>

        <div className="address-book-list">
          {addresses.length ? (
            addresses.map((address) => (
              <article className="address-book-card" key={address.id}>
                <div className="address-book-card-bar">
                  <strong>
                    {address.recipient}
                    {address.isDefault ? <span>(Địa chỉ mặc định)</span> : null}
                  </strong>
                  <div className="address-card-actions">
                    <button type="button" aria-label="Sửa địa chỉ" onClick={() => setFormMode({ type: 'edit', address })}>
                      ✎
                    </button>
                    <button type="button" aria-label="Xóa địa chỉ" onClick={() => void deleteAddress(address.id)}>
                      ×
                    </button>
                  </div>
                </div>
                <div className="address-book-card-body">
                  <h2>{address.recipient}</h2>
                  <dl>
                    <div>
                      <dt>Công ty:</dt>
                      <dd>{address.line2 || '-'}</dd>
                    </div>
                    <div>
                      <dt>Địa chỉ:</dt>
                      <dd>{formatAddress(address)}</dd>
                    </div>
                    <div>
                      <dt>Số điện thoại:</dt>
                      <dd>{address.phone || '-'}</dd>
                    </div>
                  </dl>
                  {!address.isDefault ? (
                    <button className="address-default-button" type="button" onClick={() => void setDefaultAddress(address)}>
                      Đặt làm mặc định
                    </button>
                  ) : null}
                </div>
              </article>
            ))
          ) : (
            <article className="address-empty-card">
              <strong>Chưa có địa chỉ</strong>
              <span>Thêm địa chỉ nhận hàng để checkout nhanh hơn.</span>
            </article>
          )}
          {message ? <p className="form-message">{message}</p> : null}
        </div>

        <section className={`address-editor${formMode ? ' is-open' : ''}`}>
          <button className="address-editor-title" type="button" onClick={() => setFormMode((current) => (current ? null : { type: 'create' }))}>
            {formMode?.type === 'edit' ? 'SỬA ĐỊA CHỈ' : 'NHẬP ĐỊA CHỈ MỚI'}
          </button>

          {formMode ? <AddressEditorForm mode={formMode} onCancel={() => setFormMode(null)} onSubmit={submitAddress} /> : null}
        </section>
      </section>
    </main>
  );
}

function AddressEditorForm({
  mode,
  onCancel,
  onSubmit
}: {
  mode: AddressFormMode;
  onCancel: () => void;
  onSubmit: (formData: FormData) => void | Promise<void>;
}) {
  const defaults = mode.type === 'edit' ? mode.address : null;
  const names = splitRecipient(defaults?.recipient ?? '');

  return (
    <form className="address-editor-form" action={onSubmit}>
      <label>
        <span>👤</span>
        <input name="lastName" placeholder="Họ" defaultValue={names.lastName} required />
      </label>
      <label>
        <span>👤</span>
        <input name="firstName" placeholder="Tên" defaultValue={names.firstName} required />
      </label>
      <label>
        <span>⌂</span>
        <input name="line2" placeholder="Công ty" defaultValue={defaults?.line2 ?? ''} />
      </label>
      <label>
        <span>⌂</span>
        <input name="line1" placeholder="Địa chỉ 1" defaultValue={defaults?.line1 ?? ''} required />
      </label>
      <label>
        <span>⌂</span>
        <input name="city" placeholder="Quận / Huyện / Thành phố" defaultValue={defaults?.city ?? ''} required />
      </label>
      <label>
        <span>⌖</span>
        <input name="province" placeholder="Tỉnh / Thành phố" defaultValue={defaults?.province ?? ''} />
      </label>
      <label>
        <span>☎</span>
        <input name="phone" placeholder="Số điện thoại" defaultValue={defaults?.phone ?? ''} required />
      </label>
      <input name="postalCode" type="hidden" defaultValue={defaults?.postalCode ?? ''} />
      <label className="address-editor-check">
        <input name="isDefault" type="checkbox" defaultChecked={defaults?.isDefault ?? !defaults} />
        Đặt làm địa chỉ mặc định.
      </label>
      <div className="address-editor-actions">
        <button type="submit">{mode.type === 'edit' ? 'CẬP NHẬT' : 'THÊM MỚI'}</button>
        <button type="button" onClick={onCancel}>
          Hủy
        </button>
      </div>
    </form>
  );
}
