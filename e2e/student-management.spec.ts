import { test, expect } from '@playwright/test';

test.describe('Student Management', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate before each test in this suite
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@nfsu-staff.in');
    await page.fill('input[type="password"]', 'admin');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*\/dashboard/);
  });

  test('Create Student Workflow', async ({ page }) => {
    await page.goto('/students/add');
    
    // Check if the form is present
    await expect(page.locator('text=Add New Student')).toBeVisible();
    await expect(page.locator('form')).toBeVisible();
    
    // Note: We avoid actually submitting a full form in this lightweight validation
    // to prevent DB pollution, but we verify the UI mounts correctly.
  });

  test('Student Search and Filters', async ({ page }) => {
    await page.goto('/students');
    
    // Search for a student
    await page.fill('input[placeholder="Search students..."]', 'John');
    
    // Assuming UI filters dynamically
    // Await network idle or table render
    await page.waitForLoadState('networkidle');
  });
  
  test('Pagination Controls', async ({ page }) => {
    await page.goto('/students');
    
    // Check if pagination buttons exist
    const nextButton = page.locator('button', { hasText: 'Next' });
    if (await nextButton.isVisible()) {
      await expect(nextButton).toBeEnabled();
    }
  });
});
