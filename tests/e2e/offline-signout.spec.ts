import { expect, test, type Page } from '@playwright/test';
import { PASSWORD, createSet, signUp } from './helpers';

const OFFLINE_SIGNOUT = "You're offline. Connect to the internet to sign out, so your changes aren't lost.";
const OFFLINE_SAVE = "You're offline. Connect to the internet to save.";

/** The names of Firestore's IndexedDB databases in this page's origin. */
async function firestoreDatabases(page: Page): Promise<string[]> {
  const names = await page.evaluate(async () => (await indexedDB.databases()).map((db) => db.name ?? ''));
  return names.filter((name) => name.startsWith('firestore/'));
}

test('signing out clears the sets cached on the device', async ({ page }) => {
  await signUp(page);
  await createSet(page, 'Spanish');
  await page.goto('/profile');
  // The set was cached while the library loaded.
  await expect.poll(() => firestoreDatabases(page)).not.toEqual([]);

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();

  expect(await firestoreDatabases(page)).toEqual([]);
});

test('offline, sign-out is refused and the user stays signed in', async ({ page, context }) => {
  await signUp(page);
  await page.goto('/profile');
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();

  await context.setOffline(true);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByText(OFFLINE_SIGNOUT)).toBeVisible();
  await expect(page).toHaveURL(/\/profile$/);

  await context.setOffline(false);
  await page.reload();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
});

test('offline, deleting the account is refused and deletes nothing', async ({ page, context }) => {
  await signUp(page);
  await createSet(page, 'Spanish');
  await page.goto('/profile');
  await page.getByRole('button', { name: 'Delete account' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Type DELETE to confirm').fill('DELETE');
  await dialog.getByLabel('Password').fill(PASSWORD);

  await context.setOffline(true);
  await dialog.getByRole('button', { name: 'Delete my account' }).click();
  await expect(page.getByText(OFFLINE_SAVE)).toBeVisible();
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(/\/profile$/);

  await context.setOffline(false);
  await page.goto('/home');
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.locator('.set-card')).toHaveCount(1);
});
