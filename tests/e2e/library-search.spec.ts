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

/** Writes a set straight into the emulator (rules bypassed), so a test starts from known cards. */
async function seedSet(page: Page, email: string, title: string, pairs: [string, string][], trashed = false) {
  const uid = await uidFor(page, email);
  const cards = pairs.map(([front, back], i) => ({
    id: `card-${i + 1}`,
    front,
    back,
    learned: false,
    date: '2026-01-01T00:00:00.000Z',
  }));
  const response = await page.request.post(`${DOCS}/flash-card-sets`, {
    headers: OWNER,
    data: {
      fields: {
        id: { stringValue: `seed-${title}` },
        uid: { stringValue: uid },
        title: { stringValue: title },
        color: { stringValue: '#E91E63' },
        date: { timestampValue: new Date().toISOString() },
        trashed: { booleanValue: trashed },
        fav: { booleanValue: false },
        labels: { arrayValue: {} },
        cards: { stringValue: JSON.stringify(cards) },
      },
    },
  });
  expect(response.ok()).toBe(true);
}

async function expectNoA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const summary = results.violations.map(
    (v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => `${n.target.join(' ')} ${n.any[0]?.message ?? ''}`).join(' | ')}`,
  );
  expect(summary).toEqual([]);
}

async function search(page: Page, text: string) {
  await page.getByRole('button', { name: 'Search' }).click();
  await page.getByRole('textbox', { name: 'Search' }).fill(text);
}

let email: string;

test.beforeEach(async ({ page }) => {
  email = await signUp(page);
});

async function seedTwo(page: Page) {
  await seedSet(page, email, 'Spanish verbs', [['hablar', 'to speak']]);
  await seedSet(page, email, 'Periodic table', [['Fe', 'Iron']]);
  await page.goto('/home');
  await expect(setCard(page, 'Spanish verbs')).toBeVisible();
}

test('a card-text match shows only that set, with "Matches in 1 card"', async ({ page }) => {
  await seedTwo(page);
  await search(page, 'speak');
  await expect(setCard(page, 'Spanish verbs')).toContainText('Matches in 1 card');
  await expect(setCard(page, 'Periodic table')).toHaveCount(0);
});

test('two matching cards read "Matches in 2 cards"', async ({ page }) => {
  await seedSet(page, email, 'Animals', [
    ['cat', 'gato'],
    ['catfish', 'bagre'],
  ]);
  await page.goto('/home');
  await search(page, 'cat');
  await expect(setCard(page, 'Animals')).toContainText('Matches in 2 cards');
});

test('a title match shows no "Matches in" line', async ({ page }) => {
  await seedTwo(page);
  await search(page, 'span');
  await expect(setCard(page, 'Spanish verbs')).toBeVisible();
  await expect(setCard(page, 'Spanish verbs')).not.toContainText('Matches in');
});

test('clearing the search brings every set back without a "Matches in" line', async ({ page }) => {
  await seedTwo(page);
  await search(page, 'speak');
  await expect(setCard(page, 'Periodic table')).toHaveCount(0);
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(setCard(page, 'Spanish verbs')).toBeVisible();
  await expect(setCard(page, 'Periodic table')).toBeVisible();
  await expect(page.getByText('Matches in')).toHaveCount(0);
});

test('a never-reviewed set says "Not studied yet"', async ({ page }) => {
  await seedTwo(page);
  await expect(setCard(page, 'Spanish verbs')).toContainText('Not studied yet');
});

test('a set marked learned just now says "Studied now"', async ({ page }) => {
  await seedSet(page, email, 'Solo', [['uno', 'one']]);
  await page.goto('/home');
  await setCard(page, 'Solo').getByText(/browse|review/).click();
  await expect(page.locator('.card-slider__item')).not.toHaveCount(0);
  await page.keyboard.press('k');
  await page.getByRole('dialog').getByRole('button', { name: 'Back to home' }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(setCard(page, 'Solo')).toContainText('Studied now');
});

test('switching to Hindi shows the Hindi copy', async ({ page }) => {
  await seedTwo(page);
  await page.goto('/settings');
  await page.getByRole('button', { name: 'ही' }).click();
  await page.goto('/home');
  await expect(setCard(page, 'Spanish verbs')).toContainText('अभी तक नहीं पढ़ा');
});

test('Hindi relative time reads in Hindi', async ({ page }) => {
  await seedSet(page, email, 'Solo', [['uno', 'one']]);
  await page.goto('/settings');
  await page.getByRole('button', { name: 'ही' }).click();
  await page.goto('/home');
  await setCard(page, 'Solo').getByRole('button').last().click();
  await expect(page.locator('.card-slider__item')).not.toHaveCount(0);
  await page.keyboard.press('k');
  await page.getByRole('dialog').getByRole('button').last().click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(setCard(page, 'Solo')).toContainText('पढ़ा गया');
  await expect(setCard(page, 'Solo')).not.toContainText('Studied');
});

test('a set in the bin shows neither line', async ({ page }) => {
  await seedSet(page, email, 'Old set', [['hablar', 'to speak']], true);
  await page.goto('/bin');
  await expect(setCard(page, 'Old set')).toBeVisible();
  await expect(setCard(page, 'Old set')).not.toContainText('Studied');
  await expect(setCard(page, 'Old set')).not.toContainText('Not studied yet');
  await expect(setCard(page, 'Old set')).not.toContainText('Matches in');
});

test('Home with a search active at 390 px is accessible and the card keeps its height', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedSet(page, email, 'Spanish verbs', [['hablar', 'to speak']]);
  await page.goto('/home');
  await search(page, 'speak');
  const card = setCard(page, 'Spanish verbs');
  await expect(card).toContainText('Matches in 1 card');
  await expect(card).toContainText('Not studied yet');
  const box = await card.boundingBox();
  expect(box?.height).toBeLessThanOrEqual(182);
  await expectNoA11yViolations(page);
});
