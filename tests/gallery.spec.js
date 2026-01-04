const { test, expect } = require('@playwright/test');

test('Gallery page should exist', async ({ page }) => {
  await page.goto('http://localhost:1313/gallery');
  const heading = await page.locator('h1', { hasText: 'Gallery' });
  await expect(heading).toBeVisible();
});
