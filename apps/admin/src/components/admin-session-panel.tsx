'use client';

import { useEffect, useState } from 'react';
import { adminCheck, clearAdminToken } from '../lib/browser-api';

type SessionState = 'checking' | 'authenticated' | 'anonymous';

const ADMIN_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const ADMIN_ACTIVITY_SYNC_INTERVAL_MS = 5 * 60 * 1000;
const ADMIN_SESSION_REPLACEMENT_CHECK_INTERVAL_MS = 2 * 1000;

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

  useEffect(() => {
    if (sessionState !== 'authenticated') {
      return;
    }

    let idleTimer: ReturnType<typeof setTimeout>;
    let lastServerTouchAt = Date.now();

    const expireSession = (reason: 'inactive' | 'replaced' = 'inactive') => {
      clearAdminToken();
      setEmail('');
      setSessionState('anonymous');
      window.location.replace(`/login?reason=${reason}`);
    };

    const registerActivity = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(expireSession, ADMIN_IDLE_TIMEOUT_MS);

      const now = Date.now();

      if (now - lastServerTouchAt >= ADMIN_ACTIVITY_SYNC_INTERVAL_MS) {
        lastServerTouchAt = now;
        void adminCheck().catch(expireSession);
      }
    };

    const replacementCheckTimer = setInterval(() => {
      void adminCheck().catch(() => expireSession('replaced'));
    }, ADMIN_SESSION_REPLACEMENT_CHECK_INTERVAL_MS);

    const activityEvents = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const;
    activityEvents.forEach((eventName) => window.addEventListener(eventName, registerActivity, { passive: true }));
    registerActivity();

    return () => {
      clearTimeout(idleTimer);
      clearInterval(replacementCheckTimer);
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, registerActivity));
    };
  }, [sessionState]);

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
