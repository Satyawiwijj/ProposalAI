import { test, expect } from '@playwright/test';
test('home loads and waitlist form is visible', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('ProposalPilot');
  await expect(page.getByLabel('Email address')).toBeVisible();
  await expect(page.getByRole('button', { name: /Get early access/i })).toBeVisible();
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
