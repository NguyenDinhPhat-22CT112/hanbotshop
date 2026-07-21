export const sessionCookieName = 'hanbotorder_session';

type CookieResponse = {
  cookie(name: string, value: string, options: Record<string, unknown>): void;
  clearCookie(name: string, options: Record<string, unknown>): void;
};

export function setSessionCookies(response: CookieResponse, token: string) {
  const sharedOptions = cookieOptions();
  const maxAge = readPositiveInt(process.env.JWT_EXPIRES_IN_SECONDS, 60 * 60 * 24 * 7) * 1000;

  response.cookie(sessionCookieName, token, {
    ...sharedOptions,
    httpOnly: true,
    maxAge
  });
}

export function clearSessionCookies(response: CookieResponse) {
  const options = cookieOptions();

  response.clearCookie(sessionCookieName, options);
}

function cookieOptions() {
  const secure = process.env.NODE_ENV === 'production';
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
