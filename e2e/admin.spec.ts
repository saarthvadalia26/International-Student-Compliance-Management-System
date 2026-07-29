import { test, expect } from '@playwright/test';

test.describe('Admin & Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@nfsu-staff.in');
    await page.fill('input[type="password"]', 'admin');
    await page.click('button[type="submit"]');
  });

  test('Settings Page Accessibility', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.locator('text=Settings')).toBeVisible();
    
    // Check for audit logs section
    await expect(page.locator('text=Audit Logs').or(page.locator('text=System Settings'))).toBeVisible();
  });
});
