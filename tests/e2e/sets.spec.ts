import { expect, test } from '@playwright/test';
import { createSet, setCard, signUp } from './helpers';

test.beforeEach(async ({ page }) => {
  await signUp(page);
});

test('create a set, review it, and keep progress after reload', async ({ page }) => {
  await createSet(page, 'Spanish verbs');
  const card = setCard(page, 'Spanish verbs');
  await expect(card).toContainText('0 / 1');

  await card.getByText('browse').click();
  await expect(page.getByText('hablar')).toBeVisible();
  await page.getByRole('button', { name: 'Mark as learned' }).click();
  await expect(page.locator('.view__count')).toHaveText('1/1');

  // Browser back must save, not only the in-app Back button.
  // The URL changes at once; Home only renders after the leave guard has saved.
  await page.goBack();
  await expect(setCard(page, 'Spanish verbs')).toContainText('1 / 1');
  await page.reload();
  await expect(setCard(page, 'Spanish verbs')).toContainText('1 / 1');
  await expect(setCard(page, 'Spanish verbs')).toContainText('100%');
});

test('edits are saved when leaving through the navigation menu', async ({ page }) => {
  await createSet(page, 'Draft');
  await setCard(page, 'Draft').getByRole('button', { name: 'Edit' }).click();
  await page.getByRole('button', { name: 'Draft' }).click();
  await page.getByPlaceholder('untitled set').fill('Renamed');
  await page.keyboard.press('Enter');

  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Home' }).last().click();
  await expect(page).toHaveURL(/\/home$/);
  await page.reload();
  await expect(setCard(page, 'Renamed')).toBeVisible();
});

test('search and label filter narrow the list', async ({ page }) => {
  await page.goto('/profile');
  await page.getByPlaceholder('Create new label').fill('Languages');
  await page.keyboard.press('Enter');
  await expect(page.locator('.v-chip', { hasText: 'Languages' })).toBeVisible();

  await createSet(page, 'Spanish verbs');
  await createSet(page, 'Periodic table', 'Fe', 'Iron');

  await setCard(page, 'Spanish verbs').getByRole('button', { name: 'Edit' }).click();
  await page.getByRole('button', { name: 'Options' }).first().click();
  await page.locator('.add__labels .v-chip', { hasText: 'Languages' }).click();
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page).toHaveURL(/\/home$/);

  await setCard(page, 'Spanish verbs').locator('.v-chip', { hasText: 'Languages' }).click();
  await expect(setCard(page, 'Periodic table')).toHaveCount(0);
  await page.getByRole('button', { name: 'Close' }).first().click();
  await expect(setCard(page, 'Periodic table')).toBeVisible();

  await page.getByRole('button', { name: 'Search' }).click();
  await page.getByRole('textbox', { name: 'Search' }).fill('period');
  await expect(setCard(page, 'Spanish verbs')).toHaveCount(0);
  await expect(setCard(page, 'Periodic table')).toBeVisible();
});

test('bin: move, undo, restore and delete forever', async ({ page }) => {
  await createSet(page, 'Old notes');

  await setCard(page, 'Old notes').getByRole('button', { name: 'Edit' }).click();
  await page.getByRole('button', { name: 'Options' }).first().click();
  await page.getByRole('button', { name: 'Move to bin' }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(setCard(page, 'Old notes')).toHaveCount(0);

  await page.goto('/bin');
  await setCard(page, 'Old notes').getByRole('button', { name: 'Restore' }).click();
  await expect(page.getByText('Flashcards trash bin')).toBeVisible();
  await page.goto('/home');
  await expect(setCard(page, 'Old notes')).toBeVisible();

  await setCard(page, 'Old notes').getByRole('button', { name: 'Edit' }).click();
  await page.getByRole('button', { name: 'Options' }).first().click();
  await page.getByRole('button', { name: 'Move to bin' }).click();
  await expect(page).toHaveURL(/\/home$/);
  await page.goto('/bin');
  await setCard(page, 'Old notes').getByRole('button', { name: 'Delete' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Delete forever?');
  await dialog.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('Flashcards trash bin')).toBeVisible();
  await page.reload();
  await expect(setCard(page, 'Old notes')).toHaveCount(0);
});

test('settings persist across reloads', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Dark theme' }).click();
  await page.getByRole('button', { name: 'ही' }).click();
  await page.reload();
  await expect(page.locator('.v-theme--dark').first()).toBeVisible();
  await expect(page.getByText('भाषा', { exact: true })).toBeVisible();
});
