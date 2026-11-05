import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { setCard, signUp } from './helpers';
import { DEV_PORTS } from '../../dev-ports';

const AUTH = `http://127.0.0.1:${DEV_PORTS.auth}`;
const FIRESTORE = `http://127.0.0.1:${DEV_PORTS.firestore}`;
const PROJECT = 'demo-flash-cards';
const DOCS = `${FIRESTORE}/v1/projects/${PROJECT}/databases/(default)/documents`;
const OWNER = { Authorization: 'Bearer owner' };

async function uidFor(page: Page, email: string): Promise<string> {
  const response = await page.request.post(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:query`, {
    headers: OWNER,
    data: {},
  });
  const { userInfo } = (await response.json()) as { userInfo: { localId: string; email: string }[] };
  const found = userInfo.find((u) => u.email === email);
  if (!found) {
    throw new Error(`No emulator account for ${email}`);
  }
  return found.localId;
}

/** Writes a one-card set straight into the emulator (rules bypassed). */
async function seedSet(page: Page, email: string, title: string, learned: boolean) {
  const uid = await uidFor(page, email);
  const cards = [{ id: 'card-1', front: 'uno', back: 'one', learned, date: '2026-01-01T00:00:00.000Z' }];
  const response = await page.request.post(`${DOCS}/flash-card-sets`, {
    headers: OWNER,
    data: {
      fields: {
        id: { stringValue: `seed-${title}` },
        uid: { stringValue: uid },
        title: { stringValue: title },
        color: { stringValue: '#E91E63' },
        date: { timestampValue: new Date().toISOString() },
        trashed: { booleanValue: false },
        fav: { booleanValue: false },
        labels: { arrayValue: {} },
        cards: { stringValue: JSON.stringify(cards) },
      },
    },
  });
  expect(response.ok()).toBe(true);
}

/** Settings has more than one select (order, daily goal), so the order one is found by its label. */
function orderSelect(page: Page) {
  return page.locator('.settings__select').filter({ has: page.getByLabel('Card-sets order') });
}

async function pickOrder(page: Page, name: string) {
  await page.goto('/settings');
  await orderSelect(page).locator('.v-field').click();
  await page.getByRole('option', { name }).click();
}

async function expectHomeOrder(page: Page, first: string, second: string) {
  await page.goto('/home');
  const cards = page.locator('.set-card');
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(0)).toContainText(first);
  await expect(cards.nth(1)).toContainText(second);
}

let email: string;

test.beforeEach(async ({ page }) => {
  email = await signUp(page);
});

test('Least learned first lists the less learned set first and survives a reload', async ({ page }) => {
  await seedSet(page, email, 'Alpha', true);
  await seedSet(page, email, 'Beta', false);

  await pickOrder(page, 'Least learned first');
  await expectHomeOrder(page, 'Beta', 'Alpha');

  await page.goto('/settings');
  await page.reload();
  await expect(orderSelect(page)).toContainText('Least learned first');
});

test('Recently studied lists the set that was reviewed first', async ({ page }) => {
  // Alphabetical order would put Alpha first, so reviewing Beta shows the order really changed.
  await seedSet(page, email, 'Alpha', false);
  await seedSet(page, email, 'Beta', false);

  await page.goto('/home');
  await setCard(page, 'Beta').getByText(/browse|review/).click();
  await expect(page.locator('.card-slider__item')).not.toHaveCount(0);
  await page.keyboard.press('k');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('You knew 1 of 1 card.');
  await dialog.getByRole('button', { name: 'Back to home' }).click();
  await expect(page).toHaveURL(/\/home$/);

  await pickOrder(page, 'Recently studied');
  await expectHomeOrder(page, 'Beta', 'Alpha');
});

test('the Settings page with the select open is accessible at 390 px wide', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/settings');
  await orderSelect(page).locator('.v-field').click();
  await expect(page.getByRole('option', { name: 'Recently studied' })).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const summary = results.violations.map(
    (v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => `${n.target.join(' ')} ${n.any[0]?.message ?? ''}`).join(' | ')}`,
  );
  expect(summary).toEqual([]);
});
