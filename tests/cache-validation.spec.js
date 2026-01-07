const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test.describe('Hugo Resource Cache Validation', () => {
  const resourcesDir = path.join(__dirname, '..', 'exampleSite', 'resources', '_gen', 'images');

  test('resources directory should exist after build', async () => {
    expect(fs.existsSync(resourcesDir)).toBeTruthy();
  });

  test('resources directory should contain processed images', async () => {
    if (!fs.existsSync(resourcesDir)) {
      throw new Error('Resources directory does not exist');
    }

    const files = fs.readdirSync(resourcesDir, { recursive: true });
    const imageFiles = files.filter(f =>
      typeof f === 'string' && (f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png'))
    );

    // Should have at least some processed images
    expect(imageFiles.length).toBeGreaterThan(0);
  });

  test('processed images should have correct dimensions', async ({ page }) => {
    // Navigate to a gallery page
    await page.goto('/gallery/nature/landscapes/mountains/');

    // Get the first thumbnail image
    const thumbnail = page.locator('#lightgallery .photo-item img').first();
    await expect(thumbnail).toBeVisible();

    // Get image dimensions (should be scaled to 375px height)
    const height = await thumbnail.evaluate((img) => img.naturalHeight);

    // Height should be exactly 375px (as defined in get_img_inner.html)
    expect(height).toBe(375);
  });
});
