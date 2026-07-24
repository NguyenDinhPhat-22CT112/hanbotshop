'use client';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

type AdminUser = {
  id?: string;
  email: string;
  name?: string | null;
  role: string;
};

type AdminAuthPayload = {
  tokenType?: string;
  user: AdminUser;
};

export function getAdminToken() {
  // Admin authorization is verified by server middleware and /auth/admin-check.
  // This compatibility helper no longer reads a client-visible auth cookie.
  return typeof window === 'undefined' ? null : 'cookie-session';
}

export function clearAdminToken() {
  window.localStorage.removeItem('hanbotorder_admin_token');
  void fetch(`${apiUrl}/auth/logout`, { method: 'POST', credentials: 'include', keepalive: true });
}

function getErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== 'object') {
    return fallback;
  }

  const data = payload as { message?: unknown; error?: { message?: unknown } };
  const message = Array.isArray(data.message) ? data.message.join(', ') : data.message;
  const nestedMessage = data.error?.message;

  if (typeof message === 'string') {
    return message;
  }

  return typeof nestedMessage === 'string' ? nestedMessage : fallback;
}

export async function adminFetch<T>(path: string, options: RequestInit = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      ...options.headers
    }
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      clearAdminToken();
    }

    throw new Error(getErrorMessage(payload, 'Yêu cầu quản trị không thành công.'));
  }

  return payload as T;
}

export async function adminCheck() {
  const response = await fetch(`${apiUrl}/auth/admin-check`, {
    credentials: 'include'
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    clearAdminToken();

    throw new Error(getErrorMessage(payload, 'Phiên quản trị không hợp lệ.'));
  }

  return payload as { user: AdminUser };
}

export async function adminLogin(email: string, password: string) {
  const response = await fetch(`${apiUrl}/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });
  const payload = (await response.json().catch(() => null)) as AdminAuthPayload | null;

  if (!response.ok || !payload) {
    throw new Error(getErrorMessage(payload, 'Không đăng nhập được.'));
  }

  if (payload.user.role !== 'ADMIN') {
    clearAdminToken();
    throw new Error('Tài khoản này không có quyền quản trị.');
  }

  await adminCheck();

  return payload;
}
