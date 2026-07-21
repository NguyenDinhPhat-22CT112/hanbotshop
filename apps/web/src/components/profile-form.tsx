'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/browser-api';
import { labelOf } from '../lib/labels';

type Profile = {
  email: string;
  name: string | null;
  phone: string | null;
  role: string;
  status: string;
};

export function ProfileForm() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [message, setMessage] = useState('Đang tải hồ sơ...');

  useEffect(() => {
    apiFetch<Profile>('/users/me')
      .then((payload) => {
        setProfile(payload);
        setMessage('');
      })
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'Vui lòng đăng nhập trước.'));
  }, []);

  async function submit(formData: FormData) {
    setMessage('Đang lưu...');

    try {
      const payload = await apiFetch<Profile>('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({
          name: String(formData.get('name') ?? ''),
          phone: String(formData.get('phone') ?? '')
        })
      });
      setProfile(payload);
      setMessage('Đã cập nhật hồ sơ.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không cập nhật được hồ sơ.');
    }
  }

  if (!profile) {
    return <p className="form-message">{message}</p>;
  }

  return (
    <form className="request-form" action={submit}>
      <label>
        Email
        <input value={profile.email} readOnly />
      </label>
      <label>
        Tên
        <input name="name" defaultValue={profile.name ?? ''} />
      </label>
      <label>
        Số điện thoại
        <input name="phone" defaultValue={profile.phone ?? ''} />
      </label>
      <div className="detail-meta">
        <span>Vai trò: {labelOf(profile.role)}</span>
        <span>Trạng thái: {labelOf(profile.status)}</span>
      </div>
      <button type="submit">Lưu hồ sơ</button>
      {message ? <p className="form-message">{message}</p> : null}
    </form>
  );
}
