export const sessionCookieName = 'hanbotorder_session';
export const adminSessionCookieName = 'hanbotorder_admin_session';
export const sessionScopeHeaderName = 'x-hanbotorder-session-scope';

type CookieResponse = {
  cookie(name: string, value: string, options: Record<string, unknown>): void;
  clearCookie(name: string, options: Record<string, unknown>): void;
};

export function setSessionCookies(response: CookieResponse, token: string) {
  setSessionCookie(response, sessionCookieName, token);
}

export function setAdminSessionCookie(response: CookieResponse, token: string) {
  setSessionCookie(response, adminSessionCookieName, token);
}

function setSessionCookie(response: CookieResponse, name: string, token: string) {
  const sharedOptions = cookieOptions();
  const maxAge = readPositiveInt(process.env.JWT_EXPIRES_IN_SECONDS, 60 * 60 * 24 * 7) * 1000;

  response.cookie(name, token, {
    ...sharedOptions,
    httpOnly: true,
    maxAge
  });
}

export function clearSessionCookies(response: CookieResponse) {
  clearSessionCookie(response, sessionCookieName);
}

export function clearAdminSessionCookie(response: CookieResponse) {
  clearSessionCookie(response, adminSessionCookieName);
}

function clearSessionCookie(response: CookieResponse, name: string) {
  response.clearCookie(name, cookieOptions());
}

function cookieOptions() {
  const secure = readBoolean(
    process.env.AUTH_COOKIE_SECURE,
    process.env.NODE_ENV === 'production'
  );
  const domain = process.env.AUTH_COOKIE_DOMAIN?.trim() || undefined;

  return {
    secure,
    sameSite: 'lax' as const,
    path: '/',
    ...(domain ? { domain } : {})
  };
}

function readPositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function readBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined || value.trim() === '') {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();

  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return fallback;
}
