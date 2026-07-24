import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateDepositRequired, formatVnd } from './checkout-utils';
import { safeInternalPath } from './navigation';
import { getCatalogViewState } from './catalog-state';

test('safeInternalPath accepts local redirects and rejects external redirects', () => {
  assert.equal(safeInternalPath('/checkout?step=shipping', '/account'), '/checkout?step=shipping');
  assert.equal(safeInternalPath('//evil.example', '/account'), '/account');
  assert.equal(safeInternalPath('https://evil.example', '/account'), '/account');
});

test('calculateDepositRequired combines full payments and product deposits', () => {
  const amount = calculateDepositRequired([
    { totalPrice: '100000', product: { paymentRequirement: 'FULL', depositPercent: 100 } },
    { totalPrice: '200000', product: { paymentRequirement: 'DEPOSIT', depositPercent: 30 } }
  ]);
  assert.equal(amount, 160000);
});

test('formatVnd formats valid amounts and preserves invalid values', () => {
  assert.match(formatVnd(120000), /120[.\s]000đ/);
  assert.equal(formatVnd('liên hệ'), 'liên hệ');
});

test('catalog keeps an empty result distinct from an API failure', () => {
  assert.equal(getCatalogViewState(false, 0), 'empty');
  assert.equal(getCatalogViewState(true, 0), 'unavailable');
  assert.equal(getCatalogViewState(false, 4), 'ready');
});
