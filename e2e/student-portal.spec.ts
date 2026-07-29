import { test, expect } from '@playwright/test';

test.describe('Student Portal & Tokens', () => {
  test('Student Magic Link Login Validation', async ({ page }) => {
    await page.goto('/student/login');
    
    // Wait for the form
    await expect(page.locator('text=Student Portal')).toBeVisible();
    
    // Fill out the magic link form
    await page.fill('input[type="email"]', 'test-student@example.com');
    await page.click('button[type="submit"]');
    
    // Expect success toast or message
    await expect(page.locator('text=Please check your inbox')).toBeVisible();
  });

  test('Expired/Invalid Token Handling', async ({ page }) => {
    // Simulate navigating to an expired token URL
    const response = await page.goto('/student/dashboard#error=unauthorized_client&error_description=Email+link+is+invalid+or+has+expired');
    
    // Expect UI to handle the hash error gracefully
    // Wait for client to process hash
    await page.waitForTimeout(1000);
    
    // Next middleware or client should bounce them if invalid
    const url = page.url();
    expect(url).toContain('/student/login');
  });
});
