import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

if (existsSync('.env')) process.loadEnvFile();

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: '.tmp/playwright-report' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'corepack pnpm --filter @hanbotorder/api start:dev',
      url: 'http://localhost:3001/api/v1/health/ready',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { ...process.env, NODE_ENV: 'development', EMAIL_PROVIDER: 'log', PAYMENT_GATEWAY_PROVIDER: 'manual_bank_transfer' }
    },
    {
      command: 'corepack pnpm --filter @hanbotorder/web dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000
    },
    {
      command: 'corepack pnpm --filter @hanbotorder/admin dev',
      url: 'http://localhost:3002/login',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000
    }
  ]
});
