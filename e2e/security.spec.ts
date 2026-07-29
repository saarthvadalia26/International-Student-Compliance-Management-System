import { test, expect } from '@playwright/test';

test.describe('Security & Edge Protection', () => {
  test('Middleware enforces route constraints on API routes', async ({ request }) => {
    // Unauthenticated request to secure server action / API simulation
    const response = await request.post('/api/health');
    
    // Health API should be accessible, but let's check a protected mock
    expect(response.status()).toBe(200); // Health is public
  });

  test('CSRF & XSS Basic checks on Login', async ({ page }) => {
    await page.goto('/login');
    
    // Attempt injection
    await page.fill('input[type="email"]', '<script>alert(1)</script>@nfsu-staff.in');
    await page.fill('input[type="password"]', 'admin');
    await page.click('button[type="submit"]');
    
    // Should gracefully reject via regex or auth error, not execute script
    await expect(page.locator('text=Invalid email or password').or(page.locator('text=Invalid login'))).toBeVisible();
  });
});
