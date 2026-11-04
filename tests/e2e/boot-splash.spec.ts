import { expect, test } from '@playwright/test';

test('the launch splash is gone once the login screen is showing, and the form is usable', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
  await expect(page.locator('#boot-splash')).toHaveCount(0, { timeout: 1000 });
  await page.getByLabel('Email').click();
  await expect(page.getByLabel('Email')).toBeFocused();
});
