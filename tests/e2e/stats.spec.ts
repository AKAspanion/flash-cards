import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { signUp } from './helpers';
import { DEV_PORTS } from '../../dev-ports';

const AUTH = `http://127.0.0.1:${DEV_PORTS.auth}`;
const FIRESTORE = `http://127.0.0.1:${DEV_PORTS.firestore}`;
const PROJECT = 'demo-flash-cards';
const DOCS = `${FIRESTORE}/v1/projects/${PROJECT}/databases/(default)/documents`;
const OWNER = { Authorization: 'Bearer owner' };

// Days are the device's local date, so every test fixes the browser clock.
const NOW = new Date(2026, 10, 2, 12);

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

/** Writes `user-stats/<uid>` straight into the emulator (rules bypassed). */
async function seedStats(page: Page, email: string, days: Record<string, number>, extra: Record<string, unknown> = {}) {
  const uid = await uidFor(page, email);
  const fields: Record<string, unknown> = {
    uid: { stringValue: uid },
    days: {
      mapValue: {
        fields: Object.fromEntries(Object.entries(days).map(([day, n]) => [day, { integerValue: String(n) }])),
      },
    },
  };
  for (const [key, value] of Object.entries(extra)) {
    fields[key] = typeof value === 'boolean' ? { booleanValue: value } : { integerValue: String(value) };
  }
  const response = await page.request.patch(`${DOCS}/user-stats/${uid}`, { headers: OWNER, data: { fields } });
  expect(response.ok()).toBe(true);
}

/** Writes a set of `total` cards, the first `learned` of them learned. */
async function seedSet(page: Page, email: string, title: string, total: number, learned: number, trashed = false) {
  const uid = await uidFor(page, email);
  const cards = Array.from({ length: total }, (_, i) => ({
    id: `card-${i + 1}`,
    front: `front ${i + 1}`,
    back: `back ${i + 1}`,
    learned: i < learned,
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

const bars = (page: Page) => page.getByRole('img', { name: /cards? on / });
const figure = (page: Page, label: string) => page.locator('.stats__figure').filter({ hasText: label });

let email: string;

test.beforeEach(async ({ page }) => {
  // Sign up on the real clock so the emulator's tokens are valid, then fix the date.
  email = await signUp(page);
  await page.clock.setFixedTime(NOW);
});

test('a new account shows no daily goal and no streak on Home', async ({ page }) => {
  await page.goto('/home');
  await expect(page.getByText('Welcome to your flashcards library!')).toBeVisible();
  await expect(page.getByText(/ today$/)).toHaveCount(0);
  await expect(page.getByText(/day streak/)).toHaveCount(0);
});

test('a set with cards shows 0/20 today on Home', async ({ page }) => {
  await seedSet(page, email, 'Goal set', 2, 0);
  await page.goto('/home');
  await expect(page.getByText('0/20 today')).toBeVisible();
});

test('Home shows today and the streak from seeded stats', async ({ page }) => {
  await seedSet(page, email, 'Goal set', 2, 0);
  await seedStats(page, email, { '2026-11-01': 2, '2026-11-02': 3 });
  await page.goto('/home');
  await expect(page.getByText('3/20 today')).toBeVisible();
  await expect(page.getByText('2-day streak')).toBeVisible();
});

test('with no cards the streak still shows but the daily goal does not', async ({ page }) => {
  await seedStats(page, email, { '2026-11-01': 2, '2026-11-02': 3 });
  await page.goto('/home');
  await expect(page.getByText('2-day streak')).toBeVisible();
  await expect(page.getByText(/ today$/)).toHaveCount(0);
});

test('a set moved to the bin takes the daily goal off Home', async ({ page }) => {
  await seedSet(page, email, 'Binned set', 2, 0, true);
  await seedStats(page, email, { '2026-11-02': 3 });
  await page.goto('/home');
  await expect(page.getByText('Welcome to your flashcards library!')).toBeVisible();
  await expect(page.getByText(/ today$/)).toHaveCount(0);
});

test('a streak that ended yesterday still shows, with 0 done today', async ({ page }) => {
  await seedSet(page, email, 'Goal set', 2, 0);
  await seedStats(page, email, { '2026-11-01': 2 });
  await page.goto('/home');
  await expect(page.getByText('0/20 today')).toBeVisible();
  await expect(page.getByText('1-day streak')).toBeVisible();
});

test('the Home menu opens the Stats page', async ({ page }) => {
  await page.goto('/home');
  // The page also has the floating nav button named Menu; Home's own panel handle sits in <main>.
  await page.getByRole('main').getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('main').getByRole('button', { name: 'Stats' }).click();
  await expect(page).toHaveURL(/\/stats$/);
});

test('Stats shows 30 bars and the totals', async ({ page }) => {
  await seedStats(page, email, { '2026-11-01': 2, '2026-11-02': 3 });
  await page.goto('/stats');
  await expect(bars(page)).toHaveCount(30);
  await expect(bars(page).nth(28)).toHaveAccessibleName('2 cards on Nov 1, 2026');
  await expect(bars(page).nth(29)).toHaveAccessibleName('3 cards on Nov 2, 2026');
  await expect(figure(page, 'Cards reviewed')).toContainText('5');
  await expect(figure(page, 'Current streak')).toContainText('2');
  await expect(figure(page, 'Longest streak')).toContainText('2');
});

test('a day with one card uses the singular name', async ({ page }) => {
  await seedStats(page, email, { '2026-11-01': 1 });
  await page.goto('/stats');
  await expect(bars(page).nth(28)).toHaveAccessibleName('1 card on Nov 1, 2026');
});

test('a new account has 30 empty bars and every figure at 0', async ({ page }) => {
  await page.goto('/stats');
  await expect(bars(page)).toHaveCount(30);
  await expect(bars(page).nth(29)).toHaveAccessibleName('0 cards on Nov 2, 2026');
  for (const label of ['Cards reviewed', 'Current streak', 'Longest streak', 'Sets mastered']) {
    await expect(figure(page, label)).toContainText('0');
  }
});

test('Sets mastered counts fully learned sets and ignores partial and binned ones', async ({ page }) => {
  await seedSet(page, email, 'Done', 3, 3);
  await seedSet(page, email, 'Partial', 3, 1);
  await seedSet(page, email, 'Binned', 2, 2, true);
  await page.goto('/stats');
  await expect(figure(page, 'Sets mastered')).toContainText('1');
});

test('bar dates follow the app language', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lang', 'hi'));
  await page.goto('/stats');
  const hindi = await page.evaluate(() => new Intl.DateTimeFormat('hi', { dateStyle: 'medium' }).format(new Date(2026, 10, 2)));
  await expect(page.getByRole('img', { name: new RegExp(hindi) })).toHaveCount(1);
  await expect(page.getByRole('img', { name: /Nov 2, 2026/ })).toHaveCount(0);
});

test('a second account on the same tab does not see the first one\'s counts', async ({ page }) => {
  await seedSet(page, email, 'First set', 2, 0);
  await seedStats(page, email, { '2026-11-02': 3 });
  await page.goto('/home');
  await expect(page.getByText('3/20 today')).toBeVisible();

  await page.goto('/profile');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login/);
  const second = await signUp(page);
  await page.clock.setFixedTime(NOW);
  await seedSet(page, second, 'Second set', 2, 0);
  await page.goto('/home');
  await expect(page.getByText('0/20 today')).toBeVisible();
});

test('the daily goal set in Settings shows on Home and survives a reload', async ({ page }) => {
  await seedSet(page, email, 'Goal set', 2, 0);
  await page.goto('/settings');
  const select = page.locator('.v-select').filter({ has: page.getByLabel('Daily goal') });
  await select.locator('.v-field').click();
  await page.getByRole('option', { name: '50' }).click();
  await expect(select).toContainText('50');

  await page.goto('/home');
  await expect(page.getByText('0/50 today')).toBeVisible();

  await page.goto('/settings');
  await expect(page.locator('.v-select').filter({ has: page.getByLabel('Daily goal') })).toContainText('50');
});

test('a refused goal save keeps the old goal and shows the save error', async ({ page }) => {
  await seedStats(page, email, {}, { admin: true });
  await page.goto('/settings');
  const select = page.locator('.v-select').filter({ has: page.getByLabel('Daily goal') });
  await expect(select).toContainText('20');
  await select.locator('.v-field').click();
  await page.getByRole('option', { name: '100' }).click();
  // Save errors show the Firebase error's own message; the locale text is only the fallback.
  await expect(page.locator('.v-snackbar')).toContainText(/PERMISSION_DENIED/);
  await expect(select).toContainText('20');
});

for (const [name, size] of [
  ['desktop', { width: 1280, height: 800 }],
  ['mobile', { width: 390, height: 844 }],
] as const) {
  test(`Home, Stats and Settings pass the axe scan on ${name}`, async ({ page }) => {
    await page.setViewportSize(size);
    await seedStats(page, email, { '2026-11-01': 2, '2026-11-02': 3 });

    await page.goto('/home');
    await expect(page.getByText('2-day streak')).toBeVisible();
    await expectNoA11yViolations(page);

    await page.goto('/stats');
    await expect(bars(page)).toHaveCount(30);
    await expectNoA11yViolations(page);

    await page.goto('/settings');
    await expect(page.getByText('Daily goal', { exact: true }).first()).toBeVisible();
    await expectNoA11yViolations(page);
  });
}
