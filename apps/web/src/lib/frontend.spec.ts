import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateDepositRequired, depositPercentOf, depositUnitPrice, formatVnd } from './checkout-utils';
import { safeInternalPath } from './navigation';
import { getCatalogViewState } from './catalog-state';

test('safeInternalPath accepts local redirects and rejects external redirects', () => {
  assert.equal(safeInternalPath('/checkout?step=shipping', '/account'), '/checkout?step=shipping');
  assert.equal(safeInternalPath('//evil.example', '/account'), '/account');
  assert.equal(safeInternalPath('https://evil.example', '/account'), '/account');
});

test('calculateDepositRequired combines full payments and item deposits', () => {
  const amount = calculateDepositRequired([
    { totalPrice: '100000', paymentRequirement: 'FULL', product: { depositPercent: 100 } },
    { totalPrice: '200000', paymentRequirement: 'DEPOSIT', product: { depositPercent: 30 } }
  ]);
  assert.equal(amount, 160000);
});

test('formatVnd formats valid amounts and preserves invalid values', () => {
  assert.match(formatVnd(120000), /120[.\s]000đ/);
  assert.equal(formatVnd('liên hệ'), 'liên hệ');
});

test('depositUnitPrice returns deposit price for deposit lines and full price otherwise', () => {
  assert.equal(
    depositUnitPrice({ unitPrice: '1000000', paymentRequirement: 'DEPOSIT', product: { depositPercent: 30 } }),
    '300000'
  );
  assert.equal(
    depositUnitPrice({ unitPrice: '1000000', paymentRequirement: 'FULL', product: { depositPercent: 30 } }),
    '1000000'
  );
  assert.equal(
    depositUnitPrice({ unitPrice: '1000000', paymentRequirement: 'DEPOSIT', product: { depositPercent: 100 } }),
    '1000000'
  );
});

test('deposit helpers stay finite when depositPercent is missing', () => {
  assert.equal(depositPercentOf({ product: { depositPercent: 20 } }), 20);
  assert.equal(depositPercentOf({ product: {} }), 100);
  assert.equal(depositUnitPrice({ unitPrice: '1000000', paymentRequirement: 'DEPOSIT', product: {} }), '1000000');
  assert.equal(calculateDepositRequired([{ totalPrice: '200000', paymentRequirement: 'DEPOSIT', product: {} }]), 200000);
});

test('catalog keeps an empty result distinct from an API failure', () => {
  assert.equal(getCatalogViewState(false, 0), 'empty');
  assert.equal(getCatalogViewState(true, 0), 'unavailable');
  assert.equal(getCatalogViewState(false, 4), 'ready');
});
