import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html'], ['list']],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'Mobile Small (320px)',
      use: { ...devices['iPhone SE'], viewport: { width: 320, height: 568 } },
    },
    {
      name: 'Mobile Medium (375px)',
      use: { ...devices['iPhone 12'], viewport: { width: 375, height: 667 } },
    },
    {
      name: 'Mobile Large (425px)',
      use: { ...devices['Pixel 5'], viewport: { width: 425, height: 932 } },
    },
    {
      name: 'Tablet (768px)',
      use: { ...devices['iPad Mini'], viewport: { width: 768, height: 1024 } },
    },
    {
      name: 'Laptop (1024px)',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1024, height: 768 } },
    },
    {
      name: 'Desktop (1440px)',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'Ultra Wide (1920px)',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
