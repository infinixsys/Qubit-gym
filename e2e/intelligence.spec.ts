import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const key = 'qubitfit-demo-v1';
async function savedState(page: Page) {
  return page.evaluate(storageKey => JSON.parse(localStorage.getItem(storageKey) || '{}'), key);
}

test('copilot grounds branch renewals and creates follow-ups only after approval', async ({ page }) => {
  await page.goto('/#copilot');
  await page.getByRole('combobox', { name: 'Branch', exact: true }).selectOption('koramangala');
  await page.getByRole('button', { name: /Stay ahead of renewals/ }).click();
  await expect(page.getByRole('heading', { name: '2 renewals to get ahead of' })).toBeVisible();
  const answer = page.locator('.copilot-answer');
  await expect(answer.getByText('Aarav Sharma', { exact: true })).toBeVisible();
  await expect(answer.getByText('Rahul Verma', { exact: true })).toBeVisible();
  await expect(answer.getByText(/Koramangala · Sample records as of/)).toBeVisible();
  const before = await savedState(page);
  await page.getByRole('button', { name: 'Preview 1 follow-up tasks' }).click();
  const dialog = page.getByRole('dialog', { name: 'Review follow-up tasks' });
  await expect(dialog.getByText('Discuss upcoming renewal with Rahul Verma', { exact: true })).toBeVisible();
  expect((await savedState(page)).tasks).toHaveLength(before.tasks.length);
  await dialog.getByRole('button', { name: 'Approve & create 1 tasks' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('status')).toContainText('1 internal follow-up tasks created');
  const after = await savedState(page);
  expect(after.tasks).toHaveLength(before.tasks.length + 1);
  const created = after.tasks.filter((t: { id: string }) => !before.tasks.some((old: { id: string }) => old.id === t.id));
  expect(created).toEqual([expect.objectContaining({ branchId: 'koramangala', memberId: 'm-13', kind: 'renewal', done: false })]);
  await page.getByRole('button', { name: 'Automations', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Complete Discuss upcoming renewal with Rahul Verma', exact: true })).toBeVisible();
});

test('automation enable, preview, manual run, deduplication, and task completion work together', async ({ page }) => {
  await page.goto('/#automations');
  await page.getByRole('combobox', { name: 'Branch', exact: true }).selectOption('koramangala');
  const toggle = page.getByRole('switch', { name: 'Enable Bring them back', exact: true });
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  const rule = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Bring them back', exact: true }) });
  await rule.getByRole('button', { name: 'Preview workflow' }).click();
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Run now', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Close preview' }).click();
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  const before = await savedState(page);
  await rule.getByRole('button', { name: 'Preview workflow' }).click();
  await expect(page.getByRole('dialog').getByText('Check in with Aarav Sharma', { exact: true })).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Run now', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Workflow completed: 2 new internal tasks');
  const afterFirstRun = await savedState(page);
  expect(afterFirstRun.tasks).toHaveLength(before.tasks.length + 2);
  expect(afterFirstRun.audit.filter((e: { action: string }) => e.action === 'Automation ran')).toHaveLength(1);
  await rule.getByRole('button', { name: 'Preview workflow' }).click();
  await expect(page.getByRole('dialog').getByText(/No new tasks needed/)).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Run now', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Workflow completed: 0 new internal tasks');
  expect((await savedState(page)).tasks).toHaveLength(afterFirstRun.tasks.length);
  await page.getByRole('button', { name: 'Complete Check in with Aarav Sharma', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Complete Check in with Aarav Sharma', exact: true })).toHaveCount(0);
  await page.getByRole('checkbox', { name: 'Show completed' }).check();
  await expect(page.getByRole('button', { name: 'Reopen Check in with Aarav Sharma', exact: true })).toBeVisible();
  expect((await savedState(page)).tasks.find((t: { title: string }) => t.title === 'Check in with Aarav Sharma').done).toBe(true);
});

test('workspace identity and preferences persist after a browser reload', async ({ page }) => {
  await page.goto('/#settings');
  await page.getByLabel('Gym / organization name', { exact: true }).fill('Pulse Fitness Studio');
  await page.getByLabel('Owner’s first name', { exact: true }).fill('Maya');
  await page.getByLabel('Contact email', { exact: true }).fill('maya@example.com');
  await page.getByRole('switch', { name: 'Renewal reminders', exact: true }).click();
  await page.getByRole('switch', { name: 'Weekly business digest', exact: true }).click();
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Workspace settings saved');
  await page.reload();
  await expect(page.getByLabel('Gym / organization name', { exact: true })).toHaveValue('Pulse Fitness Studio');
  await expect(page.getByLabel('Owner’s first name', { exact: true })).toHaveValue('Maya');
  await expect(page.getByLabel('Contact email', { exact: true })).toHaveValue('maya@example.com');
  await expect(page.getByRole('switch', { name: 'Renewal reminders', exact: true })).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByRole('switch', { name: 'Weekly business digest', exact: true })).toHaveAttribute('aria-checked', 'false');
  await expect(page.locator('.workspace-card')).toContainText('Pulse Fitness Studio');
});

test('reset asks for confirmation, supports cancellation, and restores original sample data', async ({ page }) => {
  await page.goto('/#settings');
  await page.evaluate(() => {
    sessionStorage.setItem('qubitfit-workout:m-1:plan-1:1', JSON.stringify({ '0-0': true }));
    sessionStorage.setItem('qubit-member-search', 'Old member');
    sessionStorage.setItem('qubit-payment-search', 'Old payment');
    sessionStorage.setItem('qubit-member-id', 'm-10');
    sessionStorage.setItem('unrelated-session-key', 'keep this');
  });
  await page.getByLabel('Gym / organization name', { exact: true }).fill('Keep My Fitness');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await page.getByRole('tab', { name: 'Data & privacy', exact: true }).click();
  await page.getByRole('button', { name: 'Reset demo', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Start fresh with sample data?' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Keep my changes', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  expect((await savedState(page)).settings.gymName).toBe('Keep My Fitness');
  expect(await page.evaluate(() => sessionStorage.getItem('qubitfit-workout:m-1:plan-1:1'))).not.toBeNull();
  await page.getByRole('button', { name: 'Reset demo', exact: true }).click();
  await dialog.getByRole('button', { name: 'Reset sample data', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('The original sample workspace is restored');
  expect((await savedState(page)).settings.gymName).toBe('Elevate Fitness');
  expect(await page.evaluate(() => Object.keys(sessionStorage).filter(key => key.startsWith('qubitfit-workout:') || ['qubit-member-search', 'qubit-payment-search', 'qubit-member-id'].includes(key)))).toEqual([]);
  expect(await page.evaluate(() => sessionStorage.getItem('unrelated-session-key'))).toBe('keep this');
  await page.reload();
  await expect(page.getByLabel('Gym / organization name', { exact: true })).toHaveValue('Elevate Fitness');
});

test('settings tabs support linked panels and roving keyboard navigation', async ({ page }) => {
  await page.goto('/#settings');
  const workspace = page.getByRole('tab', { name: 'Workspace', exact: true });
  const integrations = page.getByRole('tab', { name: 'Integrations', exact: true });
  const data = page.getByRole('tab', { name: 'Data & privacy', exact: true });
  const audit = page.getByRole('tab', { name: 'Audit trail', exact: true });
  await expect(workspace).toHaveAttribute('tabindex', '0');
  await expect(integrations).toHaveAttribute('tabindex', '-1');
  await workspace.focus();
  await page.keyboard.press('ArrowRight');
  await expect(integrations).toBeFocused();
  await expect(integrations).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel', { name: 'Integrations', exact: true })).toBeVisible();
  const panelId = await integrations.getAttribute('aria-controls');
  expect(panelId).toBe(await page.getByRole('tabpanel', { name: 'Integrations', exact: true }).getAttribute('id'));
  await page.keyboard.press('ArrowRight');
  await expect(data).toBeFocused();
  await page.keyboard.press('End');
  await expect(audit).toBeFocused();
  await expect(page.getByRole('tabpanel', { name: 'Audit trail', exact: true })).toBeVisible();
  await page.keyboard.press('Home');
  await expect(workspace).toBeFocused();
  await expect(workspace).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowLeft');
  await expect(audit).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(workspace).toBeFocused();
  await expect(page.getByRole('tabpanel')).toHaveCount(1);
});
