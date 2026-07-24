import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
import assert from 'node:assert/strict';
import test from 'node:test';
import { AuthService } from './auth.service';

type TestUser = {
  id: string; email: string; passwordHash: string; name: string; role: UserRole; status: UserStatus;
};

const activeUser: TestUser = {
  id: 'user-1', email: 'customer@example.com', passwordHash: 'hash', name: 'Customer',
  role: UserRole.CUSTOMER, status: UserStatus.ACTIVE
};

function authHarness(options?: { user?: TestUser | null; passwordMatches?: boolean }) {
  const audits: Array<Record<string, unknown>> = [];
  const prisma = {
    user: {
      findUnique: async () => options && 'user' in options ? options.user : activeUser,
      create: async ({ data }: { data: Record<string, unknown> }) => ({ ...activeUser, ...data }),
      update: async () => activeUser
    }
  };
  const password = {
    hashPassword: async () => 'new-hash',
    verifyPassword: async () => options?.passwordMatches ?? true
  };
  const token = {
    signAccessToken: () => 'signed-access-token',
    signPasswordResetToken: () => 'reset-token',
    verifyPasswordResetToken: () => ({ sub: activeUser.id, email: activeUser.email }),
    isPasswordResetTokenCurrent: () => true
  };
  const config = { get: () => undefined };
  const audit = { record: async (entry: Record<string, unknown>) => { audits.push(entry); return entry; } };
  return { service: new AuthService(prisma as never, password as never, token as never, config as never, audit as never), audits };
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
