import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { setCard, signUp } from './helpers';
import { DEV_PORTS } from '../../dev-ports';

const AUTH = `http://127.0.0.1:${DEV_PORTS.auth}`;
const FIRESTORE = `http://127.0.0.1:${DEV_PORTS.firestore}`;
const PROJECT = 'demo-flash-cards';
const DOCS = `${FIRESTORE}/v1/projects/${PROJECT}/databases/(default)/documents`;
const OWNER = { Authorization: 'Bearer owner' };
const NOW = new Date(2026, 10, 2, 10, 0, 0);

type StoredCard = { id: string; front: string; learned: boolean; srs?: unknown };

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

/** Writes a set "Verbs" with the cards "uno" and "dos" straight into the emulator. */
async function seedSet(page: Page, email: string, learned: number[] = [], withSrs = false) {
  const uid = await uidFor(page, email);
  const cards = [
    ['uno', 'one'],
    ['dos', 'two'],
  ].map(([front, back], i) => ({
    id: `card-${i + 1}`,
    front,
    back,
    learned: learned.includes(i),
    date: '2026-01-01T00:00:00.000Z',
    ...(withSrs ? { srs: { due: '2026-11-10', interval: 8, ease: 2.5, reps: 3, lapses: 0 } } : {}),
  }));
  const response = await page.request.post(`${DOCS}/flash-card-sets`, {
    headers: OWNER,
    data: {
      fields: {
        id: { stringValue: 'seed-Verbs' },
        uid: { stringValue: uid },
        title: { stringValue: 'Verbs' },
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
  return uid;
}

async function storedCards(page: Page, uid: string): Promise<StoredCard[]> {
  const response = await page.request.post(`${DOCS}:runQuery`, {
    headers: OWNER,
    data: {
      structuredQuery: {
        from: [{ collectionId: 'flash-card-sets' }],
        where: { fieldFilter: { field: { fieldPath: 'uid' }, op: 'EQUAL', value: { stringValue: uid } } },
      },
    },
  });
  const rows = (await response.json()) as { document?: { fields: { cards: { stringValue: string } } } }[];
  const doc = rows.find((r) => r.document)?.document;
  return JSON.parse(doc?.fields.cards.stringValue ?? '[]') as StoredCard[];
}

async function openSet(page: Page) {
  await page.goto('/home');
  await setCard(page, 'Verbs').getByText(/browse|review/).click();
  await expect(page.locator('.card-slider__item')).not.toHaveCount(0);
}

/** Leaves via the top-left button; on the last card that button reads "Done" and opens the summary first. */
async function leave(page: Page) {
  // The label next to the button says "Done" on the last card, where the button opens the summary.
  const onLastCard = await page.getByText(/^done$/i).isVisible();
  await page.getByRole('button', { name: 'Back' }).first().click();
  if (onLastCard) {
    await page.getByRole('dialog').getByRole('button', { name: 'Back to home' }).click();
  }
  await expect(page).toHaveURL(/\/home$/);
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

const item = (page: Page, index: number) => page.locator('.card-slider__item').nth(index);
const count = (page: Page) => page.locator('.view__count');

let email: string;

test.beforeEach(async ({ page }) => {
  email = await signUp(page);
  await page.clock.setFixedTime(NOW);
});

test('Good moves to the next card and the rating is saved on leaving', async ({ page }) => {
  const uid = await seedSet(page, email);
  await openSet(page);

  await page.keyboard.press(' ');
  await item(page, 0).getByRole('button', { name: 'Good' }).click();
  await expect(count(page)).toHaveText('1/2');
  await expect(item(page, 1)).toBeInViewport({ ratio: 0.99 });

  await leave(page);
  await expect
    .poll(async () => (await storedCards(page, uid))[0])
    .toMatchObject({
      learned: true,
      srs: { due: '2026-11-03', interval: 1, ease: 2.5, reps: 1, lapses: 0 },
    });
});

test('1 re-queues a card once and a second 1 moves on', async ({ page }) => {
  await seedSet(page, email);
  await openSet(page);

  await page.keyboard.press('ArrowRight');
  await expect(item(page, 1)).toBeInViewport({ ratio: 0.99 });
  await page.keyboard.press(' ');
  await page.keyboard.press('1');
  await expect(count(page)).toHaveText('0/2');
  await expect(page.locator('.card-slider__item')).toHaveCount(3);
  await expect(item(page, 2)).toContainText('dos');
  await expect(item(page, 2)).toBeInViewport({ ratio: 0.99 });

  await page.keyboard.press(' ');
  await page.keyboard.press('1');
  // The last queued card was rated: the summary opens and nothing was appended.
  await expect(page.getByRole('dialog')).toContainText('Session complete');
  await expect(page.locator('.card-slider__item')).toHaveCount(3);
});

test('a key press before the card is flipped rates nothing', async ({ page }) => {
  await seedSet(page, email);
  await openSet(page);

  await page.keyboard.press('3');
  await expect(count(page)).toHaveText('0/2');
  await expect(item(page, 0)).toBeInViewport({ ratio: 0.99 });
});

test('4 does nothing while the Reset dialog has focus', async ({ page }) => {
  await seedSet(page, email);
  await openSet(page);
  await page.keyboard.press(' ');
  await page.getByRole('button', { name: 'Study options' }).click();
  await expect(page.locator('.option-panel')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
  await page.getByRole('button', { name: 'Reset progress' }).click();
  await expect(page.getByRole('dialog')).toContainText('Reset progress for this set?');
  await expect.poll(() => page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true);

  await page.keyboard.press('4');
  await expect(count(page)).toHaveText('0/2');
});

test('flipping a learned card does not lower the count', async ({ page }) => {
  await seedSet(page, email, [0]);
  await openSet(page);
  await expect(count(page)).toHaveText('1/2');

  await page.keyboard.press(' ');
  await expect(item(page, 0).locator('.flash-card__inner--flipped')).toHaveCount(1);
  await expect(count(page)).toHaveText('1/2');
});

test('Reset progress clears srs from every card', async ({ page }) => {
  const uid = await seedSet(page, email, [0, 1], true);
  await openSet(page);
  await expect(count(page)).toHaveText('2/2');

  await page.getByRole('button', { name: 'Study options' }).click();
  await expect(page.locator('.option-panel')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
  await page.getByRole('button', { name: 'Reset progress' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(count(page)).toHaveText('0/2');

  await leave(page);
  await expect.poll(async () => (await storedCards(page, uid)).some((c) => 'srs' in c)).toBe(false);
  expect(await storedCards(page, uid)).toHaveLength(2);
});

test('rating the last queued card Easy opens the summary', async ({ page }) => {
  await seedSet(page, email);
  await openSet(page);

  await page.keyboard.press('ArrowRight');
  await expect(item(page, 1)).toBeInViewport({ ratio: 0.99 });
  await page.keyboard.press(' ');
  // Clicking while the flip animation runs can make the browser scroll the slider back to the first card.
  await expect
    .poll(() => item(page, 1).locator('.flash-card__inner').evaluate((el) => el.getAnimations().length))
    .toBe(0);
  await item(page, 1).getByRole('button', { name: 'Easy' }).click();
  await expect(page.getByRole('dialog')).toContainText('Session complete');
});

test('? lists the rating shortcut', async ({ page }) => {
  await seedSet(page, email);
  await openSet(page);

  await page.keyboard.press('?');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Keyboard shortcuts');
  await expect(dialog).toContainText('Rate the card (Again, Hard, Good, Easy)');
});

for (const [name, size] of [
  ['desktop', { width: 1280, height: 800 }],
  ['mobile', { width: 390, height: 844 }],
] as const) {
  test(`the review screen with a revealed card has no axe violations at ${name} width`, async ({ page }) => {
    await seedSet(page, email);
    await page.setViewportSize(size);
    await openSet(page);
    await page.keyboard.press(' ');
    await expect(item(page, 0).getByRole('button', { name: 'Good' })).toBeVisible();
    await expectNoA11yViolations(page);
  });
}

test('a failed save on leave shows the discard confirm and accepting it reaches Home', async ({ page, context }) => {
  await seedSet(page, email);
  await openSet(page);
  await page.keyboard.press(' ');
  await item(page, 0).getByRole('button', { name: 'Good' }).click();
  await expect(count(page)).toHaveText('1/2');

  const messages: string[] = [];
  page.on('dialog', (d) => {
    messages.push(d.message());
    void d.accept();
  });
  await context.setOffline(true);
  await leave(page);
  expect(messages.join(' ')).toContain('Your progress could not be saved');
});
