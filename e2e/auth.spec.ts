import { test, expect } from '@playwright/test';

test.describe('Authentication & Security Workflows', () => {
  test('Staff Login - Successful', async ({ page }) => {
    await page.goto('/login');
    
    // Fill out the login form
    await page.fill('input[type="email"]', 'admin@nfsu-staff.in');
    await page.fill('input[type="password"]', 'admin');
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Expect redirect to dashboard
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // Check for dashboard elements
    await expect(page.locator('text=My Profile')).toBeVisible();
  });

  test('Staff Login - Invalid Credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Fill out with wrong password
    await page.fill('input[type="email"]', 'admin@nfsu-staff.in');
    await page.fill('input[type="password"]', 'wrongpassword123');
    await page.click('button[type="submit"]');
    
    // Expect error alert
    await expect(page.locator('text=Invalid email or password')).toBeVisible();
  });

  test('Unauthorized Route Protection (Middleware)', async ({ page }) => {
    // Attempt direct access without session
    const response = await page.goto('/settings');
    
    // Middleware should redirect to login
    await expect(page).toHaveURL(/.*\/login/);
  });
  
  test('Session Expiration & Logout', async ({ page, context }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@nfsu-staff.in');
    await page.fill('input[type="password"]', 'admin');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // Simulate manual session clearing
    await context.clearCookies();
    await page.reload();
    
    // Should be bounced back to login
    await expect(page).toHaveURL(/.*\/login/);
  });
});
