import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const route of ['overview', 'members', 'schedule', 'leads', 'billing', 'training', 'copilot', 'automations', 'settings', 'portal']) {
  test(`${route} default screen passes automated accessibility checks`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`/#${route}`);
    await expect(page.locator('main h1')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(results.violations.map(v => ({ id: v.id, affected: v.nodes.map(n => n.target) }))).toEqual([]);
  });
}
