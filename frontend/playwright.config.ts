import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? 'list' : [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: process.env.CI ? 'off' : 'on-first-retry',
  },
  webServer: [
    {
      // Backend NestJS (port 3001)
      command: 'npm run start:dev',
      url: 'http://localhost:3001',
      cwd: '../backend',
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      // Frontend Next.js (port 3000)
      command: 'npm run dev -- --port 3000',
      url: 'http://localhost:3000',
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})

