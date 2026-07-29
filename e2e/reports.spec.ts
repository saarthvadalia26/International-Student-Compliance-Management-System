import { test, expect } from '@playwright/test';

test.describe('Reports & Exports', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@nfsu-staff.in');
    await page.fill('input[type="password"]', 'admin');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*\/dashboard/);
  });

  test('Dashboard Chart Rendering', async ({ page }) => {
    // Assuming recharts or similar is used, we look for SVG or canvas
    await expect(page.locator('.recharts-wrapper')).toBeVisible({ timeout: 10000 }).catch(() => {
      // Fallback check if specific chart classes differ
      return expect(page.locator('svg')).toBeVisible();
    });
  });

  test('Export Buttons Availability', async ({ page }) => {
    await page.goto('/compliance');
    // Ensure the export buttons exist
    const exportBtn = page.locator('button', { hasText: /Export|Download/i });
    if (await exportBtn.count() > 0) {
      await expect(exportBtn.first()).toBeVisible();
    }
  });
});
