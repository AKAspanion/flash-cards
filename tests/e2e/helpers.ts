import { expect, type Page } from '@playwright/test';

// Accounts exist only in the Auth emulator for the length of one test run.
export const PASSWORD = 'e2e-emulator-only';

export function uniqueEmail() {
  return `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
}

export async function signUp(page: Page, email = uniqueEmail()) {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Sign up' }).click();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Re-enter password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign up' }).click();
  await expect(page).toHaveURL(/\/home$/);
  return email;
}

/** Creates a set with one card through the UI and returns to Home. */
export async function createSet(page: Page, title: string, front = 'hablar', back = 'to speak') {
  await page.goto('/add');
  await page.getByRole('button', { name: 'untitled set' }).click();
  await page.getByPlaceholder('untitled set').fill(title);
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Add card' }).click();

  await page.getByText('Example front side of a flashcard').click();
  await page.getByPlaceholder('Enter text for the front side').fill(front);
  await page.getByRole('button', { name: 'Done' }).click();
  await page.getByRole('button', { name: 'Flip card' }).first().click();
  await page.getByText('Example back side of a flashcard').click();
  await page.getByPlaceholder('Enter text for the back side').fill(back);
  await page.getByRole('button', { name: 'Done' }).click();

  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(setCard(page, title)).toBeVisible();
}

export function setCard(page: Page, title: string) {
  return page.locator('.set-card').filter({ hasText: title.toUpperCase() });
}
