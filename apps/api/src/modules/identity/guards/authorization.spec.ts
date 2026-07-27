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
  const authService = { findCurrentUser: async () => ({ id: 'customer-1', email: 'customer@example.com', name: 'Customer', phone: null, role: UserRole.CUSTOMER }) };
  const tokenService = { verifyAccessToken: (token: string) => { verifiedToken = token; return { sub: 'customer-1' }; } };
  const guard = new AuthGuard(authService as never, tokenService as never);

  assert.equal(await guard.canActivate(contextFor(request) as never), true);
  assert.equal(verifiedToken, 'cookie-jwt');
  assert.equal((request as { currentUser?: { role: UserRole } }).currentUser?.role, UserRole.CUSTOMER);
});

test('AuthGuard keeps customer and Admin cookies isolated on the same hostname', async () => {
  const verifiedTokens: string[] = [];
  const tokenService = {
    verifyAccessToken: (token: string) => {
      verifiedTokens.push(token);
      return { sub: token === 'admin-jwt' ? 'admin-1' : 'customer-1' };
    }
  };
  const authService = {
    findCurrentUser: async (userId: string) => ({
      id: userId,
      email: `${userId}@example.com`,
      name: userId,
      phone: null,
      role: userId === 'admin-1' ? UserRole.ADMIN : UserRole.CUSTOMER
    })
  };
  const guard = new AuthGuard(authService as never, tokenService as never);
  const cookie = 'hanbotorder_session=customer-jwt; hanbotorder_admin_session=admin-jwt';
  const customerRequest = { headers: { cookie } };
  const adminRequest = {
    headers: {
      cookie,
      'x-hanbotorder-session-scope': 'admin'
    }
  };

  assert.equal(await guard.canActivate(contextFor(customerRequest) as never), true);
  assert.equal(
    (customerRequest as { currentUser?: { role: UserRole } }).currentUser?.role,
    UserRole.CUSTOMER
  );
  assert.equal(await guard.canActivate(contextFor(adminRequest) as never), true);
  assert.equal(
    (adminRequest as { currentUser?: { role: UserRole } }).currentUser?.role,
    UserRole.ADMIN
  );
  assert.deepEqual(verifiedTokens, ['customer-jwt', 'admin-jwt']);
});

test('AuthGuard rejects an Admin identity stored in the legacy customer cookie', async () => {
  const request = { headers: { cookie: 'hanbotorder_session=legacy-admin-jwt' } };
  const authService = {
    findCurrentUser: async () => ({
      id: 'admin-1',
      email: 'admin@example.com',
      name: 'Admin',
      phone: null,
      role: UserRole.ADMIN
    })
  };
  const tokenService = {
    verifyAccessToken: () => ({ sub: 'admin-1' })
  };
  const guard = new AuthGuard(authService as never, tokenService as never);

  await assert.rejects(
    () => guard.canActivate(contextFor(request) as never),
    UnauthorizedException
  );
});

test('AuthGuard skips an invalid duplicate cookie and accepts the valid one', async () => {
  const verifiedTokens: string[] = [];
  const checkedUserIds: string[] = [];
  const request = {
    headers: {
      cookie: 'hanbotorder_session=invalid-jwt; other=1; hanbotorder_session=valid-jwt'
    }
  };
  const authService = {
    findCurrentUser: async (userId: string) => {
      checkedUserIds.push(userId);
      return { id: 'customer-1', email: 'customer@example.com', name: 'Customer', phone: null, role: UserRole.CUSTOMER };
    }
  };
  const tokenService = {
    verifyAccessToken: (token: string) => {
      verifiedTokens.push(token);

      if (token === 'invalid-jwt') {
        throw new UnauthorizedException('Invalid access token.');
      }

      return { sub: 'customer-1' };
    }
  };
  const guard = new AuthGuard(authService as never, tokenService as never);

  assert.equal(await guard.canActivate(contextFor(request) as never), true);
  assert.deepEqual(verifiedTokens, ['invalid-jwt', 'valid-jwt']);
  assert.deepEqual(checkedUserIds, ['customer-1']);
});

test('AuthGuard keeps Bearer support for internal API clients', async () => {
  let verifiedToken = '';
  const request = { headers: { authorization: 'Bearer api-token' } };
  const authService = { findCurrentUser: async () => ({ id: 'user-1', email: 'a@b.com', name: null, phone: null, role: UserRole.CUSTOMER }) };
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
