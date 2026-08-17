import { test, expect } from '@playwright/test';
test('mobile viewport loads without horizontal scroll', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('ProposalPilot');
  const viewportSize = page.viewportSize();
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(viewportSize?.width ?? 375 + 10);
});
