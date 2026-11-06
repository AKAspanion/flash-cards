import { expect, test, type Locator, type Page } from '@playwright/test';
import { signUp } from './helpers';

/** The element's top edge on the page, to check the order things are laid out in. */
async function top(locator: Locator): Promise<number> {
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error('Element has no bounding box');
  }
  return box.y;
}

async function openProfileWithLabel(page: Page, label: string) {
  await signUp(page);
  await page.goto('/profile');
  await page.getByPlaceholder('Create new label').fill(label);
  await page.keyboard.press('Enter');
  // The label chip isn't exposed as a button; match its text.
  await expect(page.getByText(label, { exact: true })).toBeVisible();
}

test('the profile sheet is grouped under a Labels heading and then an Account heading', async ({ page }) => {
  await openProfileWithLabel(page, 'verbs');

  const headings = page.getByRole('heading', { level: 2 });
  await expect(headings).toHaveText(['Labels', 'Account']);
  const labels = page.getByRole('heading', { level: 2, name: 'Labels' });
  const account = page.getByRole('heading', { level: 2, name: 'Account' });

  // The label row sits between the two headings.
  const labelsTop = await top(labels);
  const accountTop = await top(account);
  for (const part of [page.getByPlaceholder('Create new label'), page.getByText('verbs', { exact: true })]) {
    const y = await top(part);
    expect(y).toBeGreaterThan(labelsTop);
    expect(y).toBeLessThan(accountTop);
  }

  // Member Since, Last Login and Delete account follow the Account heading, in that order.
  const member = await top(page.getByText('Member Since', { exact: true }));
  const login = await top(page.getByText('Last Login', { exact: true }));
  const remove = await top(page.getByRole('button', { name: 'Delete account' }));
  expect(member).toBeGreaterThan(accountTop);
  expect(login).toBeGreaterThan(member);
  expect(remove).toBeGreaterThan(login);

  // The heading names the section, so the row no longer repeats it.
  await expect(page.getByText('Your Labels')).toHaveCount(0);
  await expect(page.getByText('Create new label or select one to edit')).toBeVisible();
});

test('at 390 px, focusing the label field hides Delete account and Sign out', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signUp(page);
  await page.goto('/profile');
  await expect(page.getByRole('button', { name: 'Delete account' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();

  await page.getByPlaceholder('Create new label').focus();
  await expect(page.getByRole('button', { name: 'Delete account' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Sign Out' })).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 2, name: 'Account' })).toBeVisible();
});

/** The Last Login and Delete account rows' icons and title text, to compare how they line up. */
function accountRows(page: Page) {
  const loginText = page.getByText('Last Login', { exact: true });
  const remove = page.getByRole('button', { name: 'Delete account' });
  return {
    loginIcon: loginText.locator('xpath=../../i'),
    loginText,
    remove,
    removeIcon: remove.locator('i'),
    removeText: remove.getByText('Delete account', { exact: true }),
  };
}

async function left(locator: Locator): Promise<number> {
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error('Element has no bounding box');
  }
  return box.x;
}

for (const width of [390, 1280]) {
  test(`at ${width} px, the Delete account row's icon and text line up with the Last Login row's`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await signUp(page);
    await page.goto('/profile');
    const rows = accountRows(page);
    await expect(rows.remove).toBeVisible();

    expect(Math.abs((await left(rows.removeIcon)) - (await left(rows.loginIcon)))).toBeLessThanOrEqual(1);
    expect(Math.abs((await left(rows.removeText)) - (await left(rows.loginText)))).toBeLessThanOrEqual(1);
  });
}

test('the Delete account icon has the same colour as the Last Login icon', async ({ page }) => {
  await signUp(page);
  await page.goto('/profile');
  const rows = accountRows(page);
  await expect(rows.remove).toBeVisible();

  const colour = (el: Element) => getComputedStyle(el).color;
  expect(await rows.removeIcon.evaluate(colour)).toBe(await rows.loginIcon.evaluate(colour));
});

test('clicking the Delete account row opens the delete dialog', async ({ page }) => {
  await signUp(page);
  await page.goto('/profile');
  await page.getByRole('button', { name: 'Delete account' }).click();

  await expect(page.getByText('Delete your account?')).toBeVisible();
});

test('in Hindi, both section headings are in Hindi', async ({ page }) => {
  await signUp(page);
  await page.evaluate(() => localStorage.setItem('lang', 'hi'));
  await page.goto('/profile');

  await expect(page.getByRole('heading', { level: 2 })).toHaveText(['लेबल', 'खाता']);
});
