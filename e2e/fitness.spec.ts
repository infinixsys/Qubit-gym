import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { AppState } from '../src/model';

const readState = async (page: Page): Promise<AppState> => page.evaluate(() => JSON.parse(localStorage.getItem('qubitfit-demo-v1') || '{}'));

test('an eligible booking uses one credit and cancellation restores it', async ({ page }) => {
  await page.goto('/#schedule');
  await expect(page.getByRole('heading', { name: 'A little structure. A lot of energy.' })).toBeVisible();
  const initial = await readState(page);
  const member = initial.members.find(m => m.id === 'm-1')!;
  const session = initial.classes.find(c => c.id === 'class-22-3')!;
  expect(session.bookings).not.toContain(member.id);

  await page.locator('.session-card').filter({ hasText: 'Pilates & balance' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('combobox').selectOption(member.id);
  await dialog.getByRole('button', { name: 'Confirm booking', exact: true }).click();
  await expect(dialog.locator('.roster-person').filter({ hasText: member.name })).toBeVisible();
  await expect.poll(async () => (await readState(page)).members.find(m => m.id === member.id)?.credits).toBe(member.credits - 1);

  await dialog.getByRole('button', { name: `Cancel booking for ${member.name}`, exact: true }).click();
  await dialog.getByRole('button', { name: 'Confirm cancellation', exact: true }).click();
  await expect(dialog.locator('.roster-person').filter({ hasText: member.name })).toHaveCount(0);
  await expect.poll(async () => (await readState(page)).members.find(m => m.id === member.id)?.credits).toBe(member.credits);
  expect((await readState(page)).classes.find(c => c.id === session.id)?.bookings).not.toContain(member.id);
});

test('a full class waitlists without a charge and promotes on cancellation', async ({ page }) => {
  await page.goto('/#schedule');
  await page.locator('.week-day').filter({ hasText: '23' }).click();
  await page.locator('.session-card').filter({ hasText: 'The HIIT club' }).click();
  const dialog = page.getByRole('dialog');
  const initial = await readState(page);
  const session = initial.classes.find(c => c.id === 'class-23-2')!;
  const member = initial.members.find(m => m.id === 'm-2')!;
  const leaving = initial.members.find(m => m.id === session.bookings[0])!;
  expect(session.bookings).toHaveLength(session.capacity);

  await dialog.getByRole('combobox').selectOption(member.id);
  await dialog.getByRole('button', { name: 'Join waitlist', exact: true }).click();
  await expect.poll(async () => (await readState(page)).classes.find(c => c.id === session.id)?.waitlist).toContain(member.id);
  expect((await readState(page)).members.find(m => m.id === member.id)?.credits).toBe(member.credits);

  await dialog.getByRole('button', { name: `Cancel booking for ${leaving.name}`, exact: true }).click();
  await dialog.getByRole('button', { name: 'Confirm cancellation', exact: true }).click();
  await expect.poll(async () => (await readState(page)).classes.find(c => c.id === session.id)?.bookings).toContain(member.id);
  const after = await readState(page);
  const updated = after.classes.find(c => c.id === session.id)!;
  expect(updated.bookings).toHaveLength(updated.capacity);
  expect(updated.waitlist).not.toContain(member.id);
  expect(after.members.find(m => m.id === member.id)?.credits).toBe(member.credits - 1);
});

test('a completed member workout saves every set and effort across reloads', async ({ page }) => {
  await page.goto('/#portal');
  await page.getByRole('button', { name: 'My workout', exact: true }).click();
  const finish = page.getByRole('button', { name: 'Complete workout', exact: true });
  await expect(finish).toBeDisabled();
  const sets = page.locator('.portal-set');
  const setCount = await sets.count();
  expect(setCount).toBe(12);
  await sets.first().click();
  await page.getByRole('slider', { name: 'Workout effort' }).fill('7');
  await page.getByRole('button', { name: 'Explore classes', exact: true }).click();
  await page.getByRole('button', { name: 'My workout', exact: true }).click();
  await expect(sets.first()).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('slider', { name: 'Workout effort' })).toHaveValue('7');
  await page.reload();
  await page.getByRole('button', { name: 'My workout', exact: true }).click();
  await expect(sets.first()).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('slider', { name: 'Workout effort' })).toHaveValue('7');
  for (let index = 1; index < setCount; index++) await sets.nth(index).click();
  await expect(finish).toBeEnabled();
  await finish.click();
  await expect(page.getByRole('heading', { name: 'That’s a session worth celebrating.' })).toBeVisible();
  const saved = (await readState(page)).workouts;
  expect(saved).toHaveLength(1);
  expect(saved[0]).toMatchObject({ memberId: 'm-1', planId: 'plan-1', sets: 12, effort: 7 });
  expect(await page.evaluate(() => Object.keys(sessionStorage).filter(key => key.startsWith('qubitfit-workout:')))).toHaveLength(0);

  await page.reload();
  await page.getByRole('button', { name: 'My workout', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'That’s a session worth celebrating.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Complete workout', exact: true })).toHaveCount(0);
  expect((await readState(page)).workouts).toHaveLength(1);
  await page.goto('/#training');
  await expect(page.getByRole('heading', { name: 'Progress, recorded.' })).toBeVisible();
  await expect(page.locator('.training-history-row')).toContainText('Aarav Sharma');
  await expect(page.locator('.training-history-row')).toContainText('Effort 7/10');
});

test('a draft stays private until trainer review and publication', async ({ page }) => {
  await page.goto('/#training');
  await page.getByRole('button', { name: 'Create a plan', exact: true }).first().click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('Member', { exact: true }).selectOption('m-3');
  await dialog.getByLabel('Training goal').selectOption('Build consistency');
  await dialog.getByLabel('Available equipment').selectOption('Bodyweight');
  await dialog.getByLabel('Session length').selectOption('30');
  await dialog.getByLabel('Plan name (optional)').fill('Consistent foundations');
  await dialog.getByRole('button', { name: 'Prepare draft plan', exact: true }).click();
  dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Give this plan your expert eye' })).toBeVisible();
  await dialog.locator('.exercise-editor-row').first().getByRole('spinbutton', { name: 'Sets', exact: true }).fill('3');
  await expect(dialog.getByRole('button', { name: 'Approve & publish', exact: true })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  let draft = (await readState(page)).trainingPlans.find(p => p.title === 'Consistent foundations')!;
  expect(draft.status).toBe('review');
  expect(draft.exercises[0].sets).toBe(3);

  await page.goto('/#portal');
  await page.getByRole('combobox', { name: 'Preview member' }).selectOption('m-3');
  await page.getByRole('button', { name: 'My workout', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your next plan is taking shape' })).toBeVisible();

  await page.goto('/#training');
  await page.locator('.training-plan-row').filter({ hasText: 'Consistent foundations' }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByRole('checkbox').check();
  await dialog.getByRole('button', { name: 'Approve & publish', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  draft = (await readState(page)).trainingPlans.find(p => p.id === draft.id)!;
  expect(draft.status).toBe('published');
  await page.goto('/#portal');
  await page.getByRole('combobox', { name: 'Preview member' }).selectOption('m-3');
  await page.getByRole('button', { name: 'My workout', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Consistent foundations', exact: true })).toBeVisible();
  await expect(page.locator('.portal-set')).toHaveCount(9);
});
