import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldShowAdminNavigation } from './admin-navigation';

test('admin login does not render the admin navigation shell', () => {
  assert.equal(shouldShowAdminNavigation('/login'), false);
});

test('authenticated admin routes render the navigation shell', () => {
  assert.equal(shouldShowAdminNavigation('/'), true);
  assert.equal(shouldShowAdminNavigation('/orders'), true);
});
