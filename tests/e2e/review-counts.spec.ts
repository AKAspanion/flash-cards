import { expect, test, type Page } from '@playwright/test';
import { setCard, signUp } from './helpers';
import { makeSetTooBigToSave } from './size-limit-helpers';
import { readUserStats, seedUserStats, signedInUid } from './stats-helpers';
import { DEV_PORTS } from '../../dev-ports';

const FIRESTORE = `http://127.0.0.1:${DEV_PORTS.firestore}`;
const PROJECT = 'demo-flash-cards';
const DOCS = `${FIRESTORE}/v1/projects/${PROJECT}/databases/(default)/documents`;
const OWNER = { Authorization: 'Bearer owner' };

const TODAY = '2026-11-02';
const SPANISH: [string, string][] = [
  ['uno', 'one'],
  ['dos', 'two'],
  ['tres', 'three'],
];

/** Writes a set straight into the emulator (rules bypassed), so a test starts from known cards. */
async function seedSet(page: Page, title: string, pairs = SPANISH) {
  const uid = await signedInUid(page);
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
        trashed: { booleanValue: false },
        fav: { booleanValue: false },
        labels: { arrayValue: {} },
        cards: { stringValue: JSON.stringify(cards) },
      },
    },
  });
  expect(response.ok()).toBe(true);
}

async function openSet(page: Page, title: string) {
  await page.goto('/home');
  await setCard(page, title).getByText(/browse|review/).click();
  await expect(page.locator('.card-slider__item')).not.toHaveCount(0);
}

const item = (page: Page, index: number) => page.locator('.card-slider__item').nth(index);

/** Flips the focused card of the review screen and waits for the rating row. */
async function flipAt(page: Page, index: number) {
  await page.keyboard.press(' ');
  await expect(item(page, index).locator('.flash-card__rating')).toBeVisible();
}

/** Leaves via the top-left button; on the last card that button reads "Done" and opens the summary first. */
async function goHome(page: Page) {
  const onLastCard = await page.getByText(/^done$/i).isVisible();
  await page.getByRole('button', { name: 'Back' }).first().click();
  if (onLastCard) {
    await page.getByRole('dialog').getByRole('button', { name: 'Back to home' }).click();
  }
  await expect(page).toHaveURL(/\/home$/);
}

const todayCount = async (page: Page) => (await readUserStats(page))?.days[TODAY];

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(`${TODAY}T10:00:00`));
  await signUp(page);
});

test('marking, unmarking and rating count each card once, and flipping counts nothing', async ({ page }) => {
  await seedSet(page, 'Spanish');
  await openSet(page, 'Spanish');

  await page.keyboard.press('k'); // uno learned, moves to dos
  await expect(item(page, 1)).toBeInViewport({ ratio: 0.99 });
  await page.keyboard.press('ArrowLeft');
  await expect(item(page, 0)).toBeInViewport({ ratio: 0.99 });
  await page.keyboard.press('j'); // uno not learned
  await page.keyboard.press('k'); // uno learned again
  await expect(item(page, 1)).toBeInViewport({ ratio: 0.99 });
  await flipAt(page, 1);
  await page.keyboard.press('3'); // dos Good
  await expect(item(page, 2)).toBeInViewport({ ratio: 0.99 });
  await flipAt(page, 2); // tres only flipped
  await page.getByRole('button', { name: 'Back' }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Back to home' }).click();
  await expect(page).toHaveURL(/\/home$/);

  await expect.poll(() => todayCount(page)).toBe(2);
});

test('opening the same set again counts a new visit', async ({ page }) => {
  await seedSet(page, 'Spanish');
  await openSet(page, 'Spanish');
  await page.keyboard.press('k');
  await expect(item(page, 1)).toBeInViewport({ ratio: 0.99 });
  await flipAt(page, 1);
  await page.keyboard.press('3');
  await expect(item(page, 2)).toBeInViewport({ ratio: 0.99 });
  await goHome(page);
  await expect.poll(() => todayCount(page)).toBe(2);

  await openSet(page, 'Spanish');
  await page.keyboard.press('k'); // uno is already learned; marking it again is a review
  await expect(item(page, 1)).toBeInViewport({ ratio: 0.99 });
  await goHome(page);
  await expect.poll(() => todayCount(page)).toBe(3);
});

test('a card rated on /due raises today by 1', async ({ page }) => {
  await seedSet(page, 'Solo', [['solo', 'alone']]);
  await seedUserStats(page, { uid: await signedInUid(page), days: { [TODAY]: 4 } });
  await page.goto('/due');
  await expect(page.locator('.flash-card')).toBeVisible();
  await page.keyboard.press(' ');
  await expect(page.locator('.flash-card__rating')).toBeVisible();
  await page.keyboard.press('3');
  await page.getByRole('dialog').getByRole('button', { name: 'Back to home' }).click();
  await expect(page).toHaveURL(/\/home$/);

  await expect.poll(() => todayCount(page)).toBe(5);
});

test('only flipping cards writes no stats document', async ({ page }) => {
  await seedSet(page, 'Spanish');
  await openSet(page, 'Spanish');
  await flipAt(page, 0);
  await page.keyboard.press('ArrowRight');
  await expect(item(page, 1)).toBeInViewport({ ratio: 0.99 });
  await goHome(page);

  // Give a wrongly fired write time to land before asserting nothing did.
  await page.waitForTimeout(1000);
  expect(await readUserStats(page)).toBeNull();
});

test('a refused stats write shows the stats snack, and the progress is still saved', async ({ page }) => {
  await seedSet(page, 'Spanish');
  // An extra field makes the rules refuse every later write to this document.
  await seedUserStats(page, { uid: await signedInUid(page), days: {}, admin: true });
  await openSet(page, 'Spanish');
  await page.keyboard.press('k');
  await expect(item(page, 1)).toBeInViewport({ ratio: 0.99 });
  await goHome(page);

  await expect(page.getByText("Couldn't update your stats. Your progress is saved.")).toBeVisible();
  await page.reload();
  await expect(setCard(page, 'Spanish')).toContainText('1 / 3');
});

test('a failed set save records nothing when the person discards', async ({ page }) => {
  await seedSet(page, 'Spanish');
  await openSet(page, 'Spanish');
  await page.keyboard.press('k');
  await expect(item(page, 1)).toBeInViewport({ ratio: 0.99 });
  await goHome(page);
  await expect.poll(() => todayCount(page)).toBe(1);

  // Offline saves now land on the device, so the failure is the size limit instead.
  await makeSetTooBigToSave(page, 'Spanish');
  await openSet(page, 'Spanish');
  await page.keyboard.press('ArrowRight'); // move from uno to dos
  await expect(item(page, 1)).toBeInViewport({ ratio: 0.99 });
  await page.keyboard.press('k'); // dos learned
  await expect(item(page, 2)).toBeInViewport({ ratio: 0.99 });
  page.once('dialog', (d) => void d.accept());
  await goHome(page);

  await page.waitForTimeout(1000);
  expect(await todayCount(page)).toBe(1);
});
