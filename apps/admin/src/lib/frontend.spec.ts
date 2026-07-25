import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldShowAdminNavigation } from './admin-navigation';
import { createProductSlug } from './product-slug';

test('admin login does not render the admin navigation shell', () => {
  assert.equal(shouldShowAdminNavigation('/login'), false);
});

test('authenticated admin routes render the navigation shell', () => {
  assert.equal(shouldShowAdminNavigation('/'), true);
  assert.equal(shouldShowAdminNavigation('/orders'), true);
});

test('product slug is generated from a Vietnamese product name', () => {
  assert.equal(createProductSlug('  Mô hình Resin Đẹp 1/6  '), 'mo-hinh-resin-dep-1-6');
});

test('product slug collapses punctuation and repeated spaces', () => {
  assert.equal(createProductSlug('Gundam: RX-78-2 (Limited!)'), 'gundam-rx-78-2-limited');
});
