import { expect, test } from '@playwright/test';

// The Auth emulator serves Google's sign-in page itself, so the redirect flow runs for real.
test('Google sign-in by redirect lands on the page the user wanted', async ({ page }) => {
  await page.goto('/login?redirect=/settings');
  await page.getByRole('button', { name: 'Continue with Google' }).click();

  // The emulator's page can paint before its script listens, so click again until the form opens.
  const autoGenerate = page.getByText('Auto-generate user information');
  await expect(async () => {
    await page.getByRole('button', { name: 'Add new account' }).click({ timeout: 1000 });
    await expect(autoGenerate).toBeVisible({ timeout: 1000 });
  }).toPass();
  await autoGenerate.click();
  await page.getByRole('button', { name: 'Sign in with Google.com' }).click();

  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.locator('.v-snackbar')).toHaveCount(0);
});

test('going back from the Google page leaves the user on login with no error', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page.getByRole('button', { name: 'Add new account' })).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeEnabled();
  await expect(page.locator('.v-snackbar')).toHaveCount(0);
});
