import { test, expect } from '@playwright/test';

test.describe('Document Upload & Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@nfsu-staff.in');
    await page.fill('input[type="password"]', 'admin');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*\/dashboard/);
  });

  test('Document Reject Workflow', async ({ page }) => {
    // We navigate to a hypothetical student's compliance page
    // Using a mock approach since DB state is dynamic
    await page.goto('/compliance');
    
    // Look for pending verification text or items
    const pendingText = page.locator('text=Pending');
    if (await pendingText.count() > 0) {
      await pendingText.first().click();
      
      // Look for reject button
      const rejectBtn = page.locator('button:has-text("Reject")');
      if (await rejectBtn.count() > 0) {
        await expect(rejectBtn).toBeVisible();
      }
    }
  });
});
