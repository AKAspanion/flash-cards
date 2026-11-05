import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { setCard, signUp } from './helpers';
import { DEV_PORTS } from '../../dev-ports';

const AUTH = `http://127.0.0.1:${DEV_PORTS.auth}`;
const FIRESTORE = `http://127.0.0.1:${DEV_PORTS.firestore}`;
const PROJECT = 'demo-flash-cards';
const DOCS = `${FIRESTORE}/v1/projects/${PROJECT}/databases/(default)/documents`;
const OWNER = { Authorization: 'Bearer owner' };

const DAY1 = new Date('2026-11-02T12:00:00');
const DAY2 = new Date('2026-11-03T12:00:00');

interface SeedCard {
  front: string;
  back: string;
  srs?: { due: string; interval: number; ease: number; reps: number; lapses: number };
}

const good = (due: string): NonNullable<SeedCard['srs']> => ({ due, interval: 1, ease: 2.5, reps: 1, lapses: 0 });

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
async function seedSet(page: Page, email: string, title: string, cards: SeedCard[], trashed = false) {
  const uid = await uidFor(page, email);
  const body = cards.map((c, i) => ({
    id: `card-${i + 1}`,
    front: c.front,
    back: c.back,
    learned: !!c.srs,
    date: '2026-01-01T00:00:00.000Z',
    ...(c.srs ? { srs: c.srs } : {}),
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
        cards: { stringValue: JSON.stringify(body) },
      },
    },
  });
  expect(response.ok()).toBe(true);
}

const newCards = (n: number, prefix = 'q'): SeedCard[] =>
  Array.from({ length: n }, (_, i) => ({ front: `${prefix}${i + 1}`, back: `a${i + 1}` }));

async function expectNoA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const summary = results.violations.map(
    (v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => `${n.target.join(' ')} ${n.any[0]?.message ?? ''}`).join(' | ')}`,
  );
  expect(summary).toEqual([]);
}

const banner = (page: Page) => page.getByText(/\d+ cards? due/).first();
const card = (page: Page) => page.locator('.flash-card');

/** Flips the shown card and rates it with the number key. */
async function rateWith(page: Page, key: '1' | '2' | '3' | '4') {
  await expect(card(page)).toBeVisible();
  await page.keyboard.press(' ');
  await expect(page.locator('.flash-card__rating')).toBeVisible();
  await page.keyboard.press(key);
}

let email: string;

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(DAY1);
  email = await signUp(page);
});

test('a new set with 2 cards gives "2 cards due" and "2 new" on its card', async ({ page }) => {
  await seedSet(page, email, 'Verbs', newCards(2));
  await page.goto('/home');
  await expect(page.getByText('2 cards due')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Study now' })).toBeVisible();
  await expect(setCard(page, 'Verbs')).toContainText('2 new');
  await expect(setCard(page, 'Verbs')).not.toContainText('due');
});

test('a new set with 1 card uses the singular', async ({ page }) => {
  await seedSet(page, email, 'Solo', newCards(1));
  await page.goto('/home');
  await expect(page.getByText('1 card due', { exact: true })).toBeVisible();
  await expect(setCard(page, 'Solo')).toContainText('1 new');
});

test('rated cards hide the banner and counts today, and come back due tomorrow', async ({ page }) => {
  await seedSet(page, email, 'Verbs', newCards(2));
  await page.goto('/due');
  await rateWith(page, '3');
  await rateWith(page, '3');
  await page.getByRole('dialog').getByRole('button', { name: 'Back to home' }).click();
  await expect(page).toHaveURL(/\/home$/);
  await page.reload();
  await expect(setCard(page, 'Verbs')).toBeVisible();
  await expect(banner(page)).toHaveCount(0);
  await expect(setCard(page, 'Verbs')).not.toContainText('due');
  await expect(setCard(page, 'Verbs')).not.toContainText('new');

  await page.clock.setFixedTime(DAY2);
  await page.reload();
  await expect(page.getByText('2 cards due')).toBeVisible();
  await expect(setCard(page, 'Verbs')).toContainText('2 due');
});

test('a set card counts due and new cards separately', async ({ page }) => {
  await page.clock.setFixedTime(DAY2);
  await seedSet(page, email, 'Mixed', [{ front: 'a', back: 'b', srs: good('2026-11-03') }, { front: 'c', back: 'd' }]);
  await page.goto('/home');
  await expect(setCard(page, 'Mixed')).toContainText('1 due');
  await expect(setCard(page, 'Mixed')).toContainText('1 new');
});

test('the set card counts the whole set while the banner caps new cards at 20', async ({ page }) => {
  await seedSet(page, email, 'Big', newCards(100));
  await page.goto('/home');
  await expect(setCard(page, 'Big')).toContainText('100 new');
  await expect(page.getByText('20 cards due')).toBeVisible();
});

test('Study now reviews the queue across sets, set by set', async ({ page }) => {
  await seedSet(page, email, 'Alpha', [{ front: 'alpha-front', back: 'alpha-back' }]);
  await seedSet(page, email, 'Beta', [{ front: 'beta-front', back: 'beta-back' }]);
  await page.goto('/home');
  await page.getByRole('button', { name: 'Study now' }).click();
  await expect(page).toHaveURL(/\/due$/);
  await expect(page.getByText(/^alpha$/i)).toBeVisible();
  await expect(card(page)).toContainText('alpha-front');
  await rateWith(page, '3');
  await expect(page.getByText(/^beta$/i)).toBeVisible();
  await expect(card(page)).toContainText('beta-front');
});

test('finishing the queue shows the summary, and Back to home saves every set', async ({ page }) => {
  await seedSet(page, email, 'Alpha', newCards(1, 'alpha'));
  await seedSet(page, email, 'Beta', newCards(1, 'beta'));
  await page.goto('/due');
  await rateWith(page, '3');
  await rateWith(page, '3');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Session complete');
  await expect(dialog).toContainText('You knew 2 of 2 cards.');
  await expect(dialog.getByRole('button', { name: /Review .* missed/ })).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Back to home' }).click();
  await expect(page).toHaveURL(/\/home$/);
  await page.reload();
  await expect(setCard(page, 'Alpha')).toBeVisible();
  await expect(banner(page)).toHaveCount(0);
});

test('an Again card comes back once, and the missed card can be reviewed again', async ({ page }) => {
  await seedSet(page, email, 'Solo', newCards(1, 'solo'));
  await page.goto('/due');
  await rateWith(page, '1');
  await expect(card(page)).toContainText('solo1');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await rateWith(page, '1');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('You knew 0 of 1 card.');
  await dialog.getByRole('button', { name: 'Review 1 missed' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(card(page)).toContainText('solo1');
});

test('with only a set in the bin there is no banner and /due shows "Nothing due"', async ({ page }) => {
  await seedSet(page, email, 'Binned', newCards(2), true);
  await page.goto('/home');
  await expect(banner(page)).toHaveCount(0);
  await page.goto('/due');
  await expect(page.getByText('Nothing due')).toBeVisible();
  await expect(page.getByText("You're all caught up. Come back tomorrow.")).toBeVisible();
});

test('a failed save on leave asks to discard, and dismissing it stays on /due', async ({ page, context }) => {
  await seedSet(page, email, 'Solo', newCards(2, 'solo'));
  await page.goto('/due');
  await rateWith(page, '3');
  await context.setOffline(true);
  let message = '';
  page.once('dialog', (d) => {
    message = d.message();
    void d.dismiss();
  });
  await page.getByRole('button', { name: 'Back' }).first().click();
  await expect.poll(() => message).toBe('Your progress could not be saved. Leave anyway and lose it?');
  await expect(page).toHaveURL(/\/due$/);
  await context.setOffline(false);
});

for (const [name, size] of [
  ['desktop', { width: 1280, height: 800 }],
  ['mobile', { width: 390, height: 844 }],
] as const) {
  test(`Home with the banner, a revealed card and the summary pass axe at ${name} width`, async ({ page }) => {
    await seedSet(page, email, 'Alpha', newCards(2, 'alpha'));
    await page.setViewportSize(size);
    await page.goto('/home');
    await expect(page.getByText('2 cards due')).toBeVisible();
    await expectNoA11yViolations(page);

    await page.goto('/due');
    await expect(card(page)).toBeVisible();
    await page.keyboard.press(' ');
    await expect(page.locator('.flash-card__rating')).toBeVisible();
    await expectNoA11yViolations(page);

    await page.keyboard.press('3');
    await rateWith(page, '3');
    await expect(page.getByRole('dialog')).toContainText('Session complete');
    await expectNoA11yViolations(page);
  });
}
