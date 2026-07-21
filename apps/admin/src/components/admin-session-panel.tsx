'use client';

import { useEffect, useState } from 'react';
import { adminCheck, clearAdminToken } from '../lib/browser-api';

type SessionState = 'checking' | 'authenticated' | 'anonymous';

export function AdminSessionPanel() {
  const [sessionState, setSessionState] = useState<SessionState>('checking');
  const [email, setEmail] = useState('');

  useEffect(() => {
    let isMounted = true;

    adminCheck()
      .then((payload) => {
        if (!isMounted) {
          return;
        }

        setEmail(payload.user.email);
        setSessionState('authenticated');
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        clearAdminToken();
        setEmail('');
        setSessionState('anonymous');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  function logout() {
    clearAdminToken();
    setEmail('');
    setSessionState('anonymous');
    window.location.href = '/login';
  }

  return (
    <div className="admin-session">
      <span>
        {sessionState === 'checking'
          ? 'Đang kiểm tra phiên...'
          : sessionState === 'authenticated'
            ? `Đã đăng nhập${email ? `: ${email}` : ''}`
            : 'Chưa đăng nhập'}
      </span>
      {sessionState === 'authenticated' ? (
        <button type="button" onClick={logout}>
          Đăng xuất
        </button>
      ) : (
        <a href="/login">Đăng nhập</a>
      )}
    </div>
  );
}
