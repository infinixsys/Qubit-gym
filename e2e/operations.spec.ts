import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function openMembers(page: Page) {
  await page.goto('/#members');
  await expect(page.getByRole('heading', { name: 'Members', exact: true })).toBeVisible();
}

async function fillEnrollment(page: Page, name: string, email: string) {
  await page.getByRole('button', { name: 'Add member', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Full name', { exact: true }).fill(name);
  await dialog.getByLabel('Email address', { exact: true }).fill(email);
  await dialog.getByLabel('Phone number', { exact: true }).fill('+91 98765 01234');
  return dialog;
}

test('pending enrollment requires a payment, then supports check-in and survives reload', async ({ page }) => {
  await openMembers(page);
  const enrollment = await fillEnrollment(page, 'Aditi Prototype', 'aditi.prototype@example.com');
  await enrollment.getByRole('combobox', { name: /^Initial payment/ }).selectOption('pending');
  await enrollment.getByRole('button', { name: 'Add member', exact: true }).click();
  await expect(enrollment).not.toBeVisible();
  const pendingRow = page.getByRole('row').filter({ hasText: 'aditi.prototype@example.com' });
  await expect(pendingRow).toContainText('Payment pending');
  await pendingRow.getByRole('button', { name: 'View Aditi Prototype', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Check in', exact: true })).toBeDisabled();
  await page.getByRole('dialog').getByRole('button', { name: 'Review payment' }).click();
  await expect(page.getByRole('heading', { name: 'Billing & payments', exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Search invoice or member' })).toHaveValue('Aditi Prototype');
  const invoiceRow = page.getByRole('row').filter({ hasText: 'Aditi Prototype' });
  await expect(invoiceRow).toContainText('Pending');
  await invoiceRow.locator('.invoice-link').click();
  await page.getByRole('dialog').getByRole('button', { name: 'Record demo payment' }).click();
  await expect(page.getByRole('dialog')).toContainText('It does not charge a card');
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm demo payment' }).click();
  await expect(page.getByRole('dialog').getByText('Paid', { exact: true })).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Close dialog' }).click();
  await page.locator('aside').getByRole('button', { name: 'Members', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search name, email, or phone' }).fill('Aditi Prototype');
  const activeRow = page.getByRole('row').filter({ hasText: 'aditi.prototype@example.com' });
  await expect(activeRow).toContainText('Active');
  await activeRow.getByRole('button', { name: 'View Aditi Prototype', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Check in', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Checked in today' })).toBeDisabled();
  await page.reload();
  const persistedRow = page.getByRole('row').filter({ hasText: 'aditi.prototype@example.com' });
  await expect(persistedRow).toContainText('Active');
  await expect(persistedRow).toContainText('Today');
  await persistedRow.getByRole('button', { name: 'View Aditi Prototype', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Checked in today' })).toBeDisabled();
  await expect(page.getByRole('dialog').locator('.profile-metrics > div').filter({ hasText: 'All-time visits' }).locator('strong')).toHaveText('1');
});

test('duplicate member email is rejected without creating another account', async ({ page }) => {
  await openMembers(page);
  const enrollment = await fillEnrollment(page, 'Duplicate Sharma', 'aarav.sharma@example.com');
  await enrollment.getByRole('button', { name: 'Add member', exact: true }).click();
  await expect(enrollment.getByRole('alert')).toContainText('A member with this email already exists');
  await enrollment.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search name, email, or phone' }).fill('aarav.sharma@example.com');
  await expect(page.locator('.data-table tbody tr')).toHaveCount(1);
  await expect(page.locator('.data-table tbody tr')).toContainText('Aarav Sharma');
});

test('a lead converts through a demo payment into a connected active member', async ({ page }) => {
  await page.goto('/#leads');
  await page.locator('.lead-card').filter({ hasText: 'Sahil Bansal' }).click();
  const detail = page.getByRole('dialog');
  await detail.getByRole('button', { name: 'Convert to member' }).click();
  await detail.getByRole('combobox', { name: /^Membership plan/ }).selectOption('elite');
  await expect(detail).toContainText('No real payment is collected');
  await detail.getByRole('button', { name: 'Confirm demo payment & enroll' }).click();
  await expect(detail).not.toBeVisible();
  await expect(page.locator('.stage-won .lead-card').filter({ hasText: 'Sahil Bansal' })).toBeVisible();
  await page.reload();
  await page.locator('.stage-won .lead-card').filter({ hasText: 'Sahil Bansal' }).click();
  await expect(page.getByRole('dialog')).toContainText('Membership connected. Original source: Instagram.');
  await page.getByRole('dialog').getByRole('button', { name: 'View member', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('sahil.bansal@example.com');
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'Member profile', exact: true })).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Close dialog', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Search name, email, or phone' })).toHaveValue('Sahil Bansal');
  const row = page.getByRole('row').filter({ hasText: 'sahil.bansal@example.com' });
  await expect(row).toContainText('Active');
  await expect(row).toContainText('Unlimited');
  await page.locator('aside').getByRole('button', { name: 'Billing & payments', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search invoice or member' }).fill('Sahil Bansal');
  await expect(page.locator('.billing-table tbody tr')).toHaveCount(1);
  await expect(page.locator('.billing-table tbody tr')).toContainText('Paid');
  await expect(page.locator('.billing-table tbody tr')).toContainText('₹5,999');
});

test('member CSV export contains the filtered selection', async ({ page }) => {
  await openMembers(page);
  await page.getByRole('textbox', { name: 'Search name, email, or phone' }).fill('priya.menon@example.com');
  await expect(page.locator('.member-table tbody tr')).toHaveCount(1);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('qubitfit-members.csv');
  const path = await download.path();
  expect(path).toBeTruthy();
  const content = await readFile(path!, 'utf8');
  expect(content).toContain('"Name","Email","Phone","Branch","Plan","Status","Expiry","Marketing consent"');
  expect(content).toContain('"Priya Menon","priya.menon@example.com"');
  expect(content).not.toContain('Aarav Sharma');
  expect(content.split('\n')).toHaveLength(2);
});

test('member freeze pauses access and reactivation preserves payment history', async ({ page }) => {
  await openMembers(page);
  await page.getByRole('textbox', { name: 'Search name, email, or phone' }).fill('Aarav Sharma');
  await page.getByRole('row').filter({ hasText: 'aarav.sharma@example.com' }).getByRole('button', { name: 'View Aarav Sharma', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Freeze', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Check in', exact: true })).toBeDisabled();
  await expect(page.getByRole('dialog').getByText('Frozen', { exact: true })).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Reactivate', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Check in', exact: true })).toBeEnabled();
  await expect(page.getByRole('dialog').locator('.profile-payment')).toHaveCount(3);
});
