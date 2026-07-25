import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
import assert from 'node:assert/strict';
import test from 'node:test';
import { AuthService } from './auth.service';

type TestUser = {
  id: string; email: string; passwordHash: string; name: string; role: UserRole; status: UserStatus;
  adminSessionId?: string | null; adminSessionLastActiveAt?: Date | null;
};

const activeUser: TestUser = {
  id: 'user-1', email: 'customer@example.com', passwordHash: 'hash', name: 'Customer',
  role: UserRole.CUSTOMER, status: UserStatus.ACTIVE
};

function authHarness(options?: { user?: TestUser | null; passwordMatches?: boolean }) {
  const audits: Array<Record<string, unknown>> = [];
  const updates: Array<Record<string, unknown>> = [];
  const signedPayloads: Array<Record<string, unknown>> = [];
  const prisma = {
    user: {
      findUnique: async () => options && 'user' in options ? options.user : activeUser,
      create: async ({ data }: { data: Record<string, unknown> }) => ({ ...activeUser, ...data }),
      update: async ({ data }: { data: Record<string, unknown> }) => {
        updates.push(data);
        return options?.user ?? activeUser;
      },
      updateMany: async () => ({ count: 1 })
    }
  };
  const password = {
    hashPassword: async () => 'new-hash',
    verifyPassword: async () => options?.passwordMatches ?? true
  };
  const token = {
    signAccessToken: (payload: Record<string, unknown>) => {
      signedPayloads.push(payload);
      return 'signed-access-token';
    },
    signPasswordResetToken: () => 'reset-token',
    verifyPasswordResetToken: () => ({ sub: activeUser.id, email: activeUser.email }),
    isPasswordResetTokenCurrent: () => true
  };
  const config = { get: () => undefined };
  const audit = { record: async (entry: Record<string, unknown>) => { audits.push(entry); return entry; } };
  return {
    service: new AuthService(prisma as never, password as never, token as never, config as never, audit as never),
    audits,
    updates,
    signedPayloads
  };
}

test('login normalizes email, returns token internally, and audits success', async () => {
  const { service, audits } = authHarness();
  const result = await service.login({ email: ' Customer@Example.COM ', password: 'password123' }, '127.0.0.1');

  assert.equal(result.accessToken, 'signed-access-token');
  assert.equal(result.user.email, activeUser.email);
  assert.equal(audits[0].action, 'LOGIN_SUCCESS');
});

test('login rejects a wrong password and audits failure', async () => {
  const { service, audits } = authHarness({ passwordMatches: false });

  await assert.rejects(() => service.login({ email: activeUser.email, password: 'wrongpass' }), UnauthorizedException);
  assert.equal(audits[0].action, 'LOGIN_FAILED');
});

test('login rejects a disabled account without verifying password', async () => {
  const disabled = { ...activeUser, status: UserStatus.DISABLED };
  const { service, audits } = authHarness({ user: disabled });

  await assert.rejects(() => service.login({ email: disabled.email, password: 'password123' }), UnauthorizedException);
  assert.equal(audits[0].action, 'LOGIN_FAILED');
});

test('admin login creates a new server-side session and embeds it in the token', async () => {
  const admin = { ...activeUser, role: UserRole.ADMIN };
  const { service, updates, signedPayloads } = authHarness({ user: admin });

  await service.login({ email: admin.email, password: 'password123' });

  assert.equal(typeof updates[0].adminSessionId, 'string');
  assert.ok(updates[0].adminSessionLastActiveAt instanceof Date);
  assert.equal(signedPayloads[0].sessionId, updates[0].adminSessionId);
});

test('admin session validation rejects a token replaced by a newer login', async () => {
  const admin = {
    ...activeUser,
    role: UserRole.ADMIN,
    adminSessionId: 'new-session',
    adminSessionLastActiveAt: new Date()
  };
  const { service } = authHarness({ user: admin });

  await assert.rejects(() => service.findCurrentUser(admin.id, 'old-session'), UnauthorizedException);
});

test('admin session validation rejects a session idle for more than 30 minutes', async () => {
  const admin = {
    ...activeUser,
    role: UserRole.ADMIN,
    adminSessionId: 'admin-session',
    adminSessionLastActiveAt: new Date(Date.now() - 31 * 60 * 1000)
  };
  const { service } = authHarness({ user: admin });

  await assert.rejects(() => service.findCurrentUser(admin.id, admin.adminSessionId), UnauthorizedException);
});

test('registration rejects an existing email', async () => {
  const { service } = authHarness();

  await assert.rejects(
    () => service.register({ email: activeUser.email, password: 'password123', name: 'Existing' }),
    ConflictException
  );
});

test('forgot password does not reveal whether an account exists', async () => {
  const existing = authHarness();
  const missing = authHarness({ user: null });
  const foundResponse = await existing.service.forgotPassword({ email: activeUser.email });
  const missingResponse = await missing.service.forgotPassword({ email: 'missing@example.com' });

  assert.equal(foundResponse.success, true);
  assert.equal(missingResponse.success, true);
  assert.equal(foundResponse.message, missingResponse.message);
});
