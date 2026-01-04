const { test, expect } = require('@playwright/test');

test.describe('Gallery Cover Images', () => {
  test('mountains gallery should have cover image (leaf bundle with photos)', async ({ page }) => {
    await page.goto('/gallery/nature/landscapes/mountains/');

    // Check for cover image
    const coverImage = page.locator('.post-cover img');
    await expect(coverImage).toBeVisible();

    // Verify image has correct src
    const src = await coverImage.getAttribute('src');
    expect(src).toContain('/gallery/nature/landscapes/mountains/');
    expect(src).toContain('mountain-1.jpg');

    // Verify alt text exists
    const alt = await coverImage.getAttribute('alt');
    expect(alt).toBeTruthy();
  });

  test('mountains gallery cover image loads successfully', async ({ page }) => {
    await page.goto('/gallery/nature/landscapes/mountains/');

    const coverImage = page.locator('.post-cover img');
    const src = await coverImage.getAttribute('src');

    // Navigate to image and verify it loads
    const response = await page.goto(src);
    expect(response.status()).toBe(200);
  });

  test('mountains gallery should have photo thumbnails', async ({ page }) => {
    await page.goto('/gallery/nature/landscapes/mountains/');

    // Check for photo items in the lightgallery container
    const photos = page.locator('#lightgallery .photo-item img');
    const count = await photos.count();

    // Should have at least 2 mountain photos
    expect(count).toBeGreaterThanOrEqual(2);

    // Verify first photo is visible
    await expect(photos.first()).toBeVisible();
  });

  test('nature gallery list page shows child galleries', async ({ page }) => {
    await page.goto('/gallery/nature/');

    // Nature is a branch bundle (list page) that shows child galleries
    const heading = page.locator('h1.post-title');
    await expect(heading).toHaveText('Nature Photography');

    // Should have gallery collection div (may be hidden until JS loads)
    const collection = page.locator('.photo-collection');
    const count = await collection.count();
    expect(count).toBeGreaterThan(0);
  });

  test('landscapes gallery list page shows child galleries', async ({ page }) => {
    await page.goto('/gallery/nature/landscapes/');

    // Landscapes is a branch bundle (list page) that shows child galleries
    const heading = page.locator('h1.post-title');
    await expect(heading).toHaveText('Landscape Photography');

    // Should have gallery collection div
    const collection = page.locator('.photo-collection');
    const count = await collection.count();
    expect(count).toBeGreaterThan(0);
  });

  test('main gallery page has content', async ({ page }) => {
    await page.goto('/gallery/');

    const heading = page.locator('h1.post-title');
    await expect(heading).toHaveText('Gallery');

    // Should have gallery collection div
    const collection = page.locator('.photo-collection');
    const count = await collection.count();
    expect(count).toBeGreaterThan(0);
  });
});
