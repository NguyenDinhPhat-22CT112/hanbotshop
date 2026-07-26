import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import assert from 'node:assert/strict';
import test from 'node:test';
import { AuthGuard } from './auth.guard';
import { RolesGuard } from './roles.guard';

function contextFor(request: Record<string, unknown>) {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => 'handler',
    getClass: () => 'class'
  };
}

test('AuthGuard authenticates an HttpOnly cookie session and attaches current user', async () => {
  let verifiedToken = '';
  const request = { headers: { cookie: 'other=1; hanbotorder_session=cookie-jwt' } };
  const authService = { findCurrentUser: async () => ({ id: 'admin-1', email: 'admin@example.com', name: 'Admin', role: UserRole.ADMIN }) };
  const tokenService = { verifyAccessToken: (token: string) => { verifiedToken = token; return { sub: 'admin-1' }; } };
  const guard = new AuthGuard(authService as never, tokenService as never);

  assert.equal(await guard.canActivate(contextFor(request) as never), true);
  assert.equal(verifiedToken, 'cookie-jwt');
  assert.equal((request as { currentUser?: { role: UserRole } }).currentUser?.role, UserRole.ADMIN);
});

test('AuthGuard skips a stale duplicate cookie and accepts the newer admin session', async () => {
  const verifiedTokens: string[] = [];
  const checkedSessions: Array<string | undefined> = [];
  const request = {
    headers: {
      cookie: 'hanbotorder_session=stale-jwt; other=1; hanbotorder_session=current-jwt'
    }
  };
  const authService = {
    findCurrentUser: async (_userId: string, sessionId?: string) => {
      checkedSessions.push(sessionId);

      if (sessionId === 'stale-jwt') {
        throw new UnauthorizedException('Admin session was replaced by a newer login.');
      }

      return { id: 'admin-1', email: 'admin@example.com', name: 'Admin', role: UserRole.ADMIN };
    }
  };
  const tokenService = {
    verifyAccessToken: (token: string) => {
      verifiedTokens.push(token);
      return { sub: 'admin-1', sessionId: token };
    }
  };
  const guard = new AuthGuard(authService as never, tokenService as never);

  assert.equal(await guard.canActivate(contextFor(request) as never), true);
  assert.deepEqual(verifiedTokens, ['stale-jwt', 'current-jwt']);
  assert.deepEqual(checkedSessions, ['stale-jwt', 'current-jwt']);
  assert.equal(
    (request as { currentSessionId?: string }).currentSessionId,
    'current-jwt'
  );
});

test('AuthGuard keeps Bearer support for internal API clients', async () => {
  let verifiedToken = '';
  const request = { headers: { authorization: 'Bearer api-token' } };
  const authService = { findCurrentUser: async () => ({ id: 'user-1', email: 'a@b.com', name: null, role: UserRole.CUSTOMER }) };
  const tokenService = { verifyAccessToken: (token: string) => { verifiedToken = token; return { sub: 'user-1' }; } };
  const guard = new AuthGuard(authService as never, tokenService as never);

  assert.equal(await guard.canActivate(contextFor(request) as never), true);
  assert.equal(verifiedToken, 'api-token');
});

test('AuthGuard rejects requests without cookie or Bearer token', async () => {
  const guard = new AuthGuard({} as never, {} as never);

  await assert.rejects(() => guard.canActivate(contextFor({ headers: {} }) as never), UnauthorizedException);
});

test('RolesGuard permits admin and rejects customer for admin-only routes', () => {
  const reflector = { getAllAndOverride: () => [UserRole.ADMIN] };
  const guard = new RolesGuard(reflector as never);
  const adminContext = contextFor({ currentUser: { role: UserRole.ADMIN } });
  const customerContext = contextFor({ currentUser: { role: UserRole.CUSTOMER } });

  assert.equal(guard.canActivate(adminContext as never), true);
  assert.throws(() => guard.canActivate(customerContext as never), ForbiddenException);
});

test('RolesGuard rejects an unauthenticated request when a role is required', () => {
  const guard = new RolesGuard({ getAllAndOverride: () => [UserRole.ADMIN] } as never);

  assert.throws(() => guard.canActivate(contextFor({}) as never), ForbiddenException);
});
