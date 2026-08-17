import { test, expect } from '@playwright/test';

test('home visual regression desktop', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('h1');
  await expect(page).toHaveScreenshot('home-desktop.png', { fullPage: true, maxDiffPixelRatio: 0.01 });
});

test('home visual regression mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await page.waitForSelector('h1');
  await expect(page).toHaveScreenshot('home-mobile.png', { fullPage: true, maxDiffPixelRatio: 0.01 });
});

test('contrast and focus states', async ({ page }) => {
  await page.goto('/');
  const heroBtn = page.getByRole('button', { name: /Open demo/i }).first();
  await heroBtn.focus();
  await expect(heroBtn).toHaveCSS('outline-color', /rgb/);
  // basic a11y: headings present
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('h2')).toHaveCountGreaterThanOrEqual(3);
});
