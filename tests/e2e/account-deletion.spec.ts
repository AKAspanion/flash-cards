import { expect, test, type Page } from '@playwright/test';
import { PASSWORD, createSet, signUp } from './helpers';
import { DEV_PORTS } from '../../dev-ports';

const AUTH = `http://127.0.0.1:${DEV_PORTS.auth}`;
const FIRESTORE = `http://127.0.0.1:${DEV_PORTS.firestore}`;
const PROJECT = 'demo-flash-cards';
const BODY = "This deletes your account and all your sets, cards and labels. It can't be undone.";

/** The uid the Auth emulator gave this email, read before the account is deleted. */
async function uidFor(page: Page, email: string): Promise<string> {
  const response = await page.request.post(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:query`, {
    headers: { Authorization: 'Bearer owner' },
    data: {},
  });
  const { userInfo } = (await response.json()) as { userInfo: { localId: string; email: string }[] };
  const found = userInfo.find((u) => u.email === email);
  if (!found) {
    throw new Error(`No emulator account for ${email}`);
  }
  return found.localId;
}

/** How many documents in `collection` name `uid` as their owner. */
async function ownedDocs(page: Page, collection: string, uid: string): Promise<number> {
  const response = await page.request.post(`${FIRESTORE}/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`, {
    headers: { Authorization: 'Bearer owner' },
    data: {
      structuredQuery: {
        from: [{ collectionId: collection }],
        where: { fieldFilter: { field: { fieldPath: 'uid' }, op: 'EQUAL', value: { stringValue: uid } } },
      },
    },
  });
  const rows = (await response.json()) as { document?: unknown }[];
  return rows.filter((row) => row.document).length;
}

async function addLabel(page: Page, label: string) {
  await page.goto('/profile');
  await page.getByPlaceholder('Create new label').fill(label);
  await page.keyboard.press('Enter');
  // The label chip isn't exposed as a button; match its text.
  await expect(page.getByText(label, { exact: true })).toBeVisible();
}

test('deleting with a password removes the account and everything in it', async ({ page }) => {
  const email = await signUp(page);
  await createSet(page, 'Spanish');
  await addLabel(page, 'verbs');
  const uid = await uidFor(page, email);
  expect(await ownedDocs(page, 'flash-card-sets', uid)).toBe(1);
  expect(await ownedDocs(page, 'labels', uid)).toBe(1);

  await page.getByRole('button', { name: 'Delete account' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Delete your account?')).toBeVisible();
  await expect(dialog.getByText(BODY)).toBeVisible();

  // A wrong password deletes nothing.
  await dialog.getByLabel('Password').fill('wrong-password');
  await dialog.getByRole('button', { name: 'Delete my account' }).click();
  await expect(page.getByText('Incorrect email or password.')).toBeVisible();
  await expect(dialog).toBeVisible();
  expect(await ownedDocs(page, 'flash-card-sets', uid)).toBe(1);
  expect(await ownedDocs(page, 'labels', uid)).toBe(1);

  await dialog.getByLabel('Password').fill(PASSWORD);
  await dialog.getByRole('button', { name: 'Delete my account' }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByText('Your account has been deleted.')).toBeVisible();

  expect(await ownedDocs(page, 'flash-card-sets', uid)).toBe(0);
  expect(await ownedDocs(page, 'labels', uid)).toBe(0);

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByText('Incorrect email or password.')).toBeVisible();
});

test('cancel in the first step leaves the user signed in on profile', async ({ page }) => {
  await signUp(page);
  await page.goto('/profile');
  await page.getByRole('button', { name: 'Delete account' }).click();
  await expect(page.getByRole('dialog').getByText('Delete your account?')).toBeVisible();

  await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
});

test('a Google user reconfirms on Google, then deletes with one more tap', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await chooseNewGoogleAccount(page);
  await expect(page).toHaveURL(/\/home$/);

  await page.goto('/profile');
  const email = (await page.locator('.profile__text', { hasText: '@' }).innerText()).trim();
  await page.getByRole('button', { name: 'Delete account' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Continue with Google' }).click();

  // The emulator lists every account tests made; choose this one again.
  await expect(page.getByRole('button', { name: 'Add new account' })).toBeVisible();
  await page.locator('.mdc-list-item, li, [role="listitem"], button').filter({ hasText: email }).first().click();

  await expect(page).toHaveURL(/\/profile$/);
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText("You're confirmed. Delete your account now?")).toBeVisible();
  await dialog.getByRole('button', { name: 'Delete my account' }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByText('Your account has been deleted.')).toBeVisible();
});

test('delete account is a row in the profile card, not a red text button', async ({ page }) => {
  await signUp(page);
  await page.goto('/profile');
  const row = page.locator('.profile__card').getByRole('button', { name: 'Delete account' });
  await expect(row).toBeVisible();
  await expect(page.locator('.v-btn', { hasText: 'Delete account' })).toHaveCount(0);
  await row.click();
  await expect(page.getByRole('dialog').getByText('Delete your account?')).toBeVisible();
});

test('the dialog locks Cancel only while the deletion runs', async ({ page }) => {
  await signUp(page);
  await page.goto('/profile');
  // Hold the final request so the running state can be seen.
  await page.route('**/accounts:delete*', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2500));
    await route.continue();
  });
  await page.getByRole('button', { name: 'Delete account' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeEnabled();

  await dialog.getByLabel('Password').fill(PASSWORD);
  await dialog.getByRole('button', { name: 'Delete my account' }).click();
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  await expect(page).toHaveURL(/\/login/);
});

test('coming back from Google without reconfirming leaves the dialog cancellable', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await chooseNewGoogleAccount(page);
  await expect(page).toHaveURL(/\/home$/);

  await page.goto('/profile');
  await page.getByRole('button', { name: 'Delete account' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page.getByRole('button', { name: 'Add new account' })).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  // Either the page reloaded and the dialog is closed, or it came from the cache and Cancel works.
  const dialog = page.getByRole('dialog');
  if (await dialog.isVisible()) {
    await expect(dialog.getByText('Delete your account?')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeEnabled();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
  }
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
});

async function chooseNewGoogleAccount(page: Page) {
  // The emulator's page can paint before its script listens, so click again until the form opens.
  const autoGenerate = page.getByText('Auto-generate user information');
  await expect(async () => {
    await page.getByRole('button', { name: 'Add new account' }).click({ timeout: 1000 });
    await expect(autoGenerate).toBeVisible({ timeout: 1000 });
  }).toPass();
  await autoGenerate.click();
  await page.getByRole('button', { name: 'Sign in with Google.com' }).click();
}
