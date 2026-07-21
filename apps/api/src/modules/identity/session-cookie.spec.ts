import assert from 'node:assert/strict';
import test from 'node:test';
import { clearSessionCookies, sessionCookieName, setSessionCookies } from './session-cookie';

test('session JWT is stored only in an HttpOnly cookie', () => {
  const cookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
  const response = {
    cookie: (name: string, value: string, options: Record<string, unknown>) =>
      cookies.push({ name, value, options }),
    clearCookie: () => undefined
  };

  setSessionCookies(response, 'secret-jwt');

  const session = cookies.find((cookie) => cookie.name === sessionCookieName);
  assert.equal(session?.value, 'secret-jwt');
  assert.equal(session?.options.httpOnly, true);
  assert.equal(session?.options.sameSite, 'lax');
  assert.equal(cookies.length, 1);
});

test('logout clears the session cookie', () => {
  const cleared: string[] = [];
  const response = {
    cookie: () => undefined,
    clearCookie: (name: string) => cleared.push(name)
  };

  clearSessionCookies(response);

  assert.deepEqual(cleared, [sessionCookieName]);
});
