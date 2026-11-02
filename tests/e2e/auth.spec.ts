import { expect, test } from '@playwright/test';
import { PASSWORD, signUp, uniqueEmail } from './helpers';

test('signed-out visitors are sent to login and back after signing in', async ({ page }) => {
  const email = await signUp(page);

  await page.goto('/profile');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login/);

  await page.goto('/settings');
  await expect(page).toHaveURL(/\/login\?redirect=\/settings$/);

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('wrong-password');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByText('Incorrect email or password.')).toBeVisible();
  await expect(page).toHaveURL(/\/login/);

  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\/settings$/);
});

test('sign-up explains what is wrong instead of submitting', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Sign up' }).click();
  const submit = page.getByRole('button', { name: 'Sign up' });

  await submit.click();
  await expect(page.getByText('Please enter your email')).toBeVisible();

  await page.getByLabel('Email').fill(uniqueEmail());
  await page.getByLabel('Password', { exact: true }).fill('abc');
  await page.getByLabel('Re-enter password').fill('abc');
  await submit.click();
  await expect(page.getByText('Password must be at least 6 characters')).toBeVisible();

  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Re-enter password').fill(`${PASSWORD}x`);
  await submit.click();
  await expect(page.getByText('Passwords do not match')).toBeVisible();
  await expect(page).toHaveURL(/\/login/);

  await page.getByLabel('Re-enter password').fill(PASSWORD);
  await submit.click();
  await expect(page).toHaveURL(/\/home$/);
});

test('unknown pages redirect home', async ({ page }) => {
  await signUp(page);
  await page.goto('/no/such/page');
  await expect(page).toHaveURL(/\/home$/);
});
