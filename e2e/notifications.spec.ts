import { test, expect } from '@playwright/test';

test.describe('Notifications & Reminders', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@nfsu-staff.in');
    await page.fill('input[type="password"]', 'admin');
    await page.click('button[type="submit"]');
  });

  test('Notification Queue Status', async ({ page }) => {
    // We navigate to the new SRE monitoring dashboard
    await page.goto('/admin/monitoring');
    
    // Check if the dashboard loads properly
    await expect(page.locator('text=System Health Dashboard')).toBeVisible();
    await expect(page.locator('text=Email Provider')).toBeVisible();
    await expect(page.locator('text=WhatsApp Provider')).toBeVisible();
  });
});
