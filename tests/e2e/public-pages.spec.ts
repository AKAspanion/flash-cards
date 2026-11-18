import { expect, test } from '@playwright/test';
import { PASSWORD, signUp } from './helpers';

const MAILTO = 'mailto:panditankit1995@gmail.com';

test('a signed-out visitor can read the privacy policy', async ({ page }) => {
  await page.goto('/privacy');
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.getByRole('heading', { name: 'Privacy policy' })).toBeVisible();
  await expect(page.getByText('Last updated: 6 November 2026')).toBeVisible();
  for (const title of [
    'What we store',
    'How it is used',
    'Where it is kept',
    'Deleting your data',
    'Children',
    'Contact',
  ]) {
    await expect(page.getByText(title, { exact: true })).toBeVisible();
  }
  await expect(page.locator(`a[href="${MAILTO}"]`)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Delete account' })).toHaveAttribute('href', '/delete-account');
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page).toHaveURL(/\/login/);
});

test('a signed-in user stays on the privacy policy and goes back home', async ({ page }) => {
  await signUp(page);
  await page.goto('/privacy');
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.getByRole('heading', { name: 'Privacy policy' })).toBeVisible();
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page).toHaveURL(/\/home$/);
});

test('a signed-out visitor is led through sign-in to the profile from delete-account', async ({ page }) => {
  const email = await signUp(page);
  await page.goto('/profile');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login/);

  await page.goto('/delete-account');
  await expect(page).toHaveURL(/\/delete-account$/);
  await expect(page.getByRole('heading', { name: 'Delete your FlashCards account' })).toBeVisible();
  for (const title of ["What's deleted", 'In the app', "Can't sign in?"]) {
    await expect(page.getByText(title, { exact: true })).toBeVisible();
  }
  await page.getByRole('link', { name: 'Sign in to delete' }).click();
  await expect(page).toHaveURL(/\/login\?redirect=\/profile$/);

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\/profile$/);
});

test('a signed-in user on delete-account is offered the profile', async ({ page }) => {
  await signUp(page);
  await page.goto('/delete-account');
  await expect(page).toHaveURL(/\/delete-account$/);
  await page.getByRole('link', { name: 'Go to profile' }).click();
  await expect(page).toHaveURL(/\/profile$/);
});

test('delete-account explains the email route', async ({ page }) => {
  await page.goto('/delete-account');
  await expect(page.getByText("Can't sign in?")).toBeVisible();
  await expect(page.getByText('within 30 days')).toBeVisible();
  await expect(page.locator(`a[href="${MAILTO}"]`)).toBeVisible();
});

test('a signed-out visitor can read the terms of service', async ({ page }) => {
  await page.goto('/terms');
  await expect(page).toHaveURL(/\/terms$/);
  await expect(page.getByRole('heading', { name: 'Terms of service' })).toBeVisible();
  await expect(page.getByText('Last updated: 17 November 2026')).toBeVisible();
  for (const title of [
    'Who can use it',
    'Your sets',
    'Sharing',
    "What's not allowed",
    'If the terms are broken',
    'No warranty',
    'Governing law',
    'Contact',
  ]) {
    await expect(page.getByText(title, { exact: true })).toBeVisible();
  }
  await expect(page.getByText('the laws of India')).toBeVisible();
  await expect(page.locator(`a[href="${MAILTO}"]`)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Privacy policy' })).toHaveAttribute('href', '/privacy');
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page).toHaveURL(/\/login/);
});

test('a signed-in user stays on the terms and goes back home', async ({ page }) => {
  await signUp(page);
  await page.goto('/terms');
  await expect(page).toHaveURL(/\/terms$/);
  await expect(page.getByRole('heading', { name: 'Terms of service' })).toBeVisible();
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page).toHaveURL(/\/home$/);
});

test('the login screen links to the privacy policy and the terms', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('link', { name: 'Privacy policy' })).toHaveAttribute('href', '/privacy');
  await expect(page.getByRole('link', { name: 'Terms of service' })).toHaveAttribute('href', '/terms');
  await expect(page.getByText('By signing up you agree')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Delete account' })).toHaveCount(0);
});

test('sign-up says that signing up agrees to the terms and the privacy policy', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Sign up' }).click();
  const agree = page.getByText('By signing up you agree to the Terms of service and Privacy policy.');
  await expect(agree).toBeVisible();
  await expect(agree.getByRole('link', { name: 'Terms of service' })).toHaveAttribute('href', '/terms');
  await expect(agree.getByRole('link', { name: 'Privacy policy' })).toHaveAttribute('href', '/privacy');
  await expect(page.getByRole('checkbox')).toHaveCount(0);
});

test('password reset shows no agree line', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Forgot password?' }).click();
  await expect(page.getByRole('button', { name: 'Send reset link' })).toBeVisible();
  await expect(page.getByText('By signing up you agree')).toHaveCount(0);
});

test('the privacy policy links to the terms', async ({ page }) => {
  await page.goto('/privacy');
  await expect(page.getByRole('link', { name: 'Terms of service' })).toHaveAttribute('href', '/terms');
});

test('the login email field takes focus only with a fine pointer', async ({ page }, testInfo) => {
  await page.goto('/login');
  const email = page.getByLabel('Email');
  await expect(email).toBeVisible();
  if (testInfo.project.name === 'mobile') {
    await expect(email).not.toBeFocused();
  } else {
    await expect(email).toBeFocused();
  }
});

test('the info screen links to the three public pages', async ({ page }) => {
  await signUp(page);
  await page.goto('/info');
  await expect(page.getByRole('link', { name: 'Privacy policy' })).toHaveAttribute('href', '/privacy');
  await expect(page.getByRole('link', { name: 'Terms of service' })).toHaveAttribute('href', '/terms');
  await expect(page.getByRole('link', { name: 'Delete account' })).toHaveAttribute('href', '/delete-account');
});
