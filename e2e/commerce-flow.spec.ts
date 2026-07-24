import { expect, test } from '@playwright/test';

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for E2E tests`);
  return value;
}

const customer = {
  email: process.env.SEED_CUSTOMER_EMAIL || 'customer@hanbotorder.local',
  password: requiredEnv('SEED_CUSTOMER_PASSWORD')
};
const admin = {
  email: process.env.SEED_ADMIN_EMAIL || 'admin@hanbotorder.local',
  password: requiredEnv('SEED_ADMIN_PASSWORD')
};

test('customer can login, add to cart, checkout, open bank transfer and cancel order', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/login?next=/products/limited-figure-in-stock');
  await page.getByPlaceholder('Email').fill(customer.email);
  await page.getByPlaceholder('Mật khẩu').fill(customer.password);
  await page.getByRole('button', { name: 'ĐĂNG NHẬP' }).click();
  await expect(page).toHaveURL(/\/products\/limited-figure-in-stock/);

  const defaultVariant = page.getByRole('button', { name: /Mặc định/ });
  if (await defaultVariant.count()) await defaultVariant.click();
  await page.getByRole('button', { name: 'Thêm vào giỏ' }).click();
  await expect(page.getByRole('status')).toContainText('Đã thêm vào giỏ hàng');

  await page.goto('/cart');
  await expect(page.getByText('Figure giới hạn có sẵn')).toBeVisible();
  await page.getByRole('link', { name: 'THANH TOÁN', exact: true }).click();
  await expect(page).toHaveURL(/\/checkout/);

  await page.getByLabel('Người nhận').fill('Khách hàng E2E');
  await page.getByLabel('Số điện thoại').fill('0901234567');
  await page.getByLabel('Địa chỉ').fill('123 Nguyễn Huệ');
  await page.getByLabel('Thành phố').fill('Hồ Chí Minh');
  await page.getByLabel('Tỉnh/Thành').fill('Hồ Chí Minh');
  await page.getByRole('checkbox').check();
  const checkoutForm = page.locator('form.checkout-address-form');
  const formValid = await checkoutForm.evaluate((form) => (form as HTMLFormElement).checkValidity());
  expect(formValid).toBe(true);
  const checkoutResponse = page.waitForResponse(
    (response) => response.url().endsWith('/api/v1/checkout') && response.request().method() === 'POST',
    { timeout: 15_000 }
  );
  await page.getByRole('button', { name: 'Xác nhận tạo đơn hàng' }).click();
  const response = await checkoutResponse;
  expect(response.ok(), await response.text()).toBe(true);
  await expect(page).toHaveURL(/\/account\/orders\//);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('HBO-');

  await page.getByRole('button', { name: 'Thanh toán đơn hàng' }).click();
  await expect(page).toHaveURL(/\/checkout\/bank-transfer\?paymentId=/);
  await expect(page.getByRole('heading', { name: 'Chuyển khoản ngân hàng' })).toBeVisible();
  await page.getByRole('link', { name: 'Xem chi tiết đơn hàng' }).click();
  await page.getByRole('button', { name: 'Hủy đơn hàng' }).click();
  await expect(page.getByRole('status')).toContainText('Đơn hàng đã được hủy');
});

test('admin area rejects customers, accepts admins and hides navigation on login', async ({ browser }) => {
  const customerContext = await browser.newContext();
  const customerPage = await customerContext.newPage();
  await customerPage.goto('http://localhost:3002/login');
  await expect(customerPage.getByRole('navigation', { name: 'Điều hướng quản trị' })).toHaveCount(0);
  await customerPage.getByLabel('Email').fill(customer.email);
  await customerPage.getByLabel('Mật khẩu').fill(customer.password);
  await customerPage.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(customerPage.getByRole('status')).toContainText('không có quyền quản trị');
  await expect(customerPage).toHaveURL(/\/login/);
  await customerContext.close();

  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  await adminPage.goto('http://localhost:3002/login');
  await adminPage.getByLabel('Email').fill(admin.email);
  await adminPage.getByLabel('Mật khẩu').fill(admin.password);
  await adminPage.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(adminPage).toHaveURL('http://localhost:3002/');
  await expect(adminPage.getByRole('navigation', { name: 'Điều hướng quản trị' })).toBeVisible();
  await adminContext.close();
});
