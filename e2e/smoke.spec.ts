import { test, expect } from '@playwright/test';
test('home loads and hero is visible', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('Your next proposal');
  await expect(page.getByRole('button', { name: /Open demo/i })).toBeVisible();
  await expect(page.getByText(/AI proposals in under a minute/i)).toBeVisible();
});
test('waitlist submit shows success', async ({ page, request }) => {
  const res = await request.post('/api/waitlist', {
    data: { email: `test-${Date.now()}@example.com` },
  });
  expect(res.ok()).toBeTruthy();
  const json = await res.json();
  expect(json.ok).toBe(true);
});
test('api templates returns json', async ({ request }) => {
  const res = await request.get('/api/templates');
  expect(res.ok()).toBeTruthy();
  const json = await res.json();
  expect(Array.isArray(json.templates)).toBeTruthy();
});
