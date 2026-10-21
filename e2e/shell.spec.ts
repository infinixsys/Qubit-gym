import { expect, test } from '@playwright/test';

const routes = ['overview', 'members', 'schedule', 'leads', 'billing', 'training', 'copilot', 'automations', 'settings', 'portal'];

test('all desktop and mobile surfaces render without page errors or document overflow', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      await page.goto(`/#${route}`);
      await expect(page.locator('main h1')).toBeVisible();
      const dimensions = await page.evaluate(() => ({ width: innerWidth, body: document.body.scrollWidth }));
      expect(dimensions.body, `${route} at ${width}px`).toBeLessThanOrEqual(dimensions.width);
    }
  }
  expect(errors).toEqual([]);
});

test('workspace search retains keyboard focus and filters members across repeated navigation', async ({ page }) => {
  await page.goto('/#settings');
  await page.keyboard.press('Control+k');
  const search = page.getByRole('dialog', { name: 'Find your next move' });
  const input = search.getByRole('textbox', { name: 'Search members, pages…' });
  await input.pressSequentially('Aarav', { delay: 30 });
  await expect(input).toHaveValue('Aarav');
  await expect(input).toBeFocused();
  await search.getByRole('button', { name: /Aarav Sharma/ }).click();
  await expect(page.locator('.member-table tbody tr')).toHaveCount(1);
  await expect(page.locator('.member-table')).toContainText('Aarav Sharma');

  await page.keyboard.press('Control+k');
  await input.fill('');
  await input.pressSequentially('Priya', { delay: 30 });
  await search.getByRole('button', { name: /Priya Menon/ }).click();
  await expect(page.locator('.member-table tbody tr')).toHaveCount(1);
  await expect(page.locator('.member-table')).toContainText('Priya Menon');

  await page.getByRole('button', { name: 'Search workspace' }).click();
  await page.keyboard.press('Escape');
  await expect(search).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Search workspace' })).toBeFocused();
});

test('skip-to-content moves focus without changing the active route', async ({ page }) => {
  await page.goto('/#settings');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#settings$/);
  await expect(page.locator('main')).toBeFocused();
  await expect(page.getByRole('heading', { name: 'Make yourself at home.' })).toBeVisible();
});

test('an incomplete saved demo is safely replaced instead of crashing', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('qubitfit-demo-v1', JSON.stringify({ version: 1, members: [], payments: [], classes: [], trainingPlans: [] })));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Good morning, Ananya.' })).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('qubitfit-demo-v1') || '{}'));
  expect(saved.members.length).toBe(36);
  expect(saved.tasks.length).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('mobile navigation opens, changes pages, and closes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.locator('.sidebar')).toHaveClass(/sidebar-open/);
  await page.getByRole('button', { name: 'Members', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Members', exact: true })).toBeVisible();
  await expect(page.locator('.sidebar')).not.toHaveClass(/sidebar-open/);
  await expect(page.getByRole('button', { name: 'Close navigation', exact: true })).toHaveCount(0);
});
