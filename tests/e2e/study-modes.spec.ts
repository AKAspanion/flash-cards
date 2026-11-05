import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { setCard, signUp } from './helpers';
import { DEV_PORTS } from '../../dev-ports';

const AUTH = `http://127.0.0.1:${DEV_PORTS.auth}`;
const FIRESTORE = `http://127.0.0.1:${DEV_PORTS.firestore}`;
const PROJECT = 'demo-flash-cards';
const DOCS = `${FIRESTORE}/v1/projects/${PROJECT}/databases/(default)/documents`;
const OWNER = { Authorization: 'Bearer owner' };

const SPANISH: [string, string][] = [
  ['uno', 'one'],
  ['dos', 'two'],
  ['tres', 'three'],
];

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
async function seedSet(page: Page, email: string, title: string, pairs = SPANISH, learned: number[] = []) {
  const uid = await uidFor(page, email);
  const cards = pairs.map(([front, back], i) => ({
    id: `card-${i + 1}`,
    front,
    back,
    learned: learned.includes(i),
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
  return uid;
}

async function studiedAtFor(page: Page, uid: string): Promise<string | undefined> {
  const response = await page.request.post(`${DOCS}:runQuery`, {
    headers: OWNER,
    data: {
      structuredQuery: {
        from: [{ collectionId: 'flash-card-sets' }],
        where: { fieldFilter: { field: { fieldPath: 'uid' }, op: 'EQUAL', value: { stringValue: uid } } },
      },
    },
  });
  const rows = (await response.json()) as { document?: { fields: { studiedAt?: { timestampValue: string } } } }[];
  return rows.find((r) => r.document)?.document?.fields.studiedAt?.timestampValue;
}

async function openSet(page: Page, title: string) {
  await page.goto('/home');
  await setCard(page, title).getByText(/browse|review/).click();
  await expect(page.locator('.card-slider__item')).not.toHaveCount(0);
}

async function openPanel(page: Page) {
  await page.getByRole('button', { name: 'Study options' }).click();
  // The panel slides up; wait for it to stop before anything is clicked inside it.
  await expect(page.locator('.option-panel')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
  await expect(page.getByRole('button', { name: 'Reset progress' })).toBeVisible();
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
});

test('Space flips the card and the arrows move between cards', async ({ page }) => {
  await seedSet(page, email, 'Spanish');
  await openSet(page, 'Spanish');

  await page.keyboard.press(' ');
  await expect(item(page, 0).locator('.flash-card__inner--flipped')).toHaveCount(1);
  await expect(item(page, 0).getByText('one')).toBeVisible();

  await page.keyboard.press('ArrowRight');
  await expect(item(page, 1)).toBeInViewport({ ratio: 0.99 });
  await page.keyboard.press('ArrowLeft');
  await expect(item(page, 0)).toBeInViewport({ ratio: 0.99 });
});

test('K and J set the learned value and K moves to the next card', async ({ page }) => {
  await seedSet(page, email, 'Spanish');
  await openSet(page, 'Spanish');

  await page.keyboard.press('k');
  await expect(count(page)).toHaveText('1/3');
  await expect(item(page, 1)).toBeInViewport({ ratio: 0.99 });
  await page.keyboard.press('K');
  await expect(count(page)).toHaveText('2/3');
  await page.keyboard.press('j');
  await expect(count(page)).toHaveText('2/3');
  await expect(item(page, 2)).toBeInViewport({ ratio: 0.99 });
});

test('shortcuts do not fire while a dialog has focus', async ({ page }) => {
  await seedSet(page, email, 'Spanish', SPANISH, [0, 1]);
  await openSet(page, 'Spanish');
  await openPanel(page);
  await page.getByRole('button', { name: 'Reset progress' }).click();
  await expect(page.getByRole('dialog')).toContainText('Reset progress for this set? All cards will be marked as not learned.');
  // Vuetify moves focus into the dialog once it has opened.
  await expect.poll(() => page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true);
  await page.keyboard.press('j');
  await page.keyboard.press('k');
  await expect(count(page)).toHaveText('2/3');
});

test('? and the options button open the shortcut list', async ({ page }) => {
  await seedSet(page, email, 'Spanish');
  await openSet(page, 'Spanish');

  const rows = ['Flip the card', 'Next card', 'Previous card', 'Mark as learned', 'Mark as not learned', 'Show keyboard shortcuts'];
  await page.keyboard.press('?');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Keyboard shortcuts');
  for (const row of rows) {
    await expect(dialog).toContainText(row);
  }
  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await openPanel(page);
  await page.getByRole('button', { name: 'Keyboard shortcuts' }).click();
  await expect(page.getByRole('dialog')).toContainText('Show keyboard shortcuts');
});

test('Unlearned only shows the unlearned cards and keeps the whole-set count', async ({ page }) => {
  await seedSet(page, email, 'Spanish', SPANISH, [0, 2]);
  await openSet(page, 'Spanish');
  await openPanel(page);

  await page.getByLabel('Unlearned only').check({ force: true });
  await expect(page.locator('.card-slider__item')).toHaveCount(1);
  await expect(item(page, 0)).toContainText('dos');
  await expect(count(page)).toHaveText('2/3');
});

test('Unlearned only with every card learned shows the empty state', async ({ page }) => {
  await seedSet(page, email, 'Spanish', SPANISH, [0, 1, 2]);
  await openSet(page, 'Spanish');
  await openPanel(page);

  await page.getByLabel('Unlearned only').check({ force: true });
  await expect(page.getByText('All cards learned')).toBeVisible();
  await expect(page.getByText('Turn off “Unlearned only” or reset progress to study again.')).toBeVisible();
});

test('Back first shows the back and is remembered after a reload', async ({ page }) => {
  await seedSet(page, email, 'Spanish');
  await openSet(page, 'Spanish');
  await openPanel(page);

  await page.getByLabel('Back first').check({ force: true });
  await expect(item(page, 0).getByText('one')).toBeVisible();

  await page.reload();
  await expect(page.locator('.card-slider__item')).toHaveCount(3);
  await openPanel(page);
  await expect(page.getByLabel('Back first')).toBeChecked();
});

test('Shuffle is remembered after a reload and keeps every card', async ({ page }) => {
  await seedSet(page, email, 'Spanish');
  await openSet(page, 'Spanish');
  await openPanel(page);

  await page.getByLabel('Shuffle').check({ force: true });
  await expect(page.locator('.card-slider__item')).toHaveCount(3);

  await page.reload();
  await expect(page.locator('.card-slider__item')).toHaveCount(3);
  await openPanel(page);
  await expect(page.getByLabel('Shuffle')).toBeChecked();
});

test('Reset progress asks first, then clears and saves', async ({ page }) => {
  await seedSet(page, email, 'Spanish', SPANISH, [0, 1]);
  await openSet(page, 'Spanish');
  await expect(count(page)).toHaveText('2/3');
  await openPanel(page);

  await page.getByRole('button', { name: 'Reset progress' }).click();
  let dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Reset progress for this set? All cards will be marked as not learned.');
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(count(page)).toHaveText('2/3');

  await page.getByRole('button', { name: 'Reset progress' }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(count(page)).toHaveText('0/3');

  await page.getByRole('button', { name: 'Back' }).first().click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(setCard(page, 'Spanish')).toContainText('0 / 3');
  await openSet(page, 'Spanish');
  await expect(count(page)).toHaveText('0/3');
});

test('the summary counts the session, reviews missed cards and saves studiedAt', async ({ page }) => {
  const uid = await seedSet(page, email, 'Spanish');
  await openSet(page, 'Spanish');

  await page.keyboard.press('k');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.getByRole('button', { name: 'Back' }).first().click();
  let dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Session complete');
  await expect(dialog).toContainText('You knew 1 of 3 cards.');
  await expect(dialog.getByRole('button', { name: 'Review 2 missed' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Review 2 missed' }).click();

  await expect(page.locator('.card-slider__item')).toHaveCount(2);
  await expect(item(page, 0)).toContainText('dos');
  await expect(item(page, 0)).toBeInViewport({ ratio: 0.99 });
  await page.keyboard.press('k');
  await page.keyboard.press('k');
  dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('You knew 2 of 2 cards.');
  await expect(dialog.getByRole('button', { name: /Review .* missed/ })).toHaveCount(0);
  await expect(count(page)).toHaveText('3/3');

  await dialog.getByRole('button', { name: 'Back to home' }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(setCard(page, 'Spanish')).toContainText('3 / 3');

  const studiedAt = await studiedAtFor(page, uid);
  expect(studiedAt).toBeTruthy();
  expect(Date.now() - new Date(studiedAt!).getTime()).toBeLessThan(60_000);
});

test('K on the last card and Right-skipped cards give the 2 of 3 summary', async ({ page }) => {
  await seedSet(page, email, 'Spanish');
  await openSet(page, 'Spanish');

  await page.keyboard.press('k');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('k');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('You knew 2 of 3 cards.');
  await expect(dialog.getByRole('button', { name: 'Review 1 missed' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Review 1 missed' }).click();
  await expect(page.locator('.card-slider__item')).toHaveCount(1);
  await expect(item(page, 0)).toContainText('dos');
});

test('a one-card set uses the singular in the summary', async ({ page }) => {
  await seedSet(page, email, 'Single', [['hablar', 'to speak']]);
  await openSet(page, 'Single');
  await page.keyboard.press('k');
  await expect(page.getByRole('dialog')).toContainText('You knew 1 of 1 card.');
});

test('the study options and the summary have no accessibility violations', async ({ page }) => {
  await seedSet(page, email, 'Spanish');
  await openSet(page, 'Spanish');
  await openPanel(page);
  await expectNoA11yViolations(page);

  await page.getByRole('button', { name: 'Study options' }).click();
  await page.keyboard.press('k');
  await page.keyboard.press('k');
  await page.keyboard.press('k');
  await expect(page.getByRole('dialog')).toContainText('Session complete');
  await expectNoA11yViolations(page);
});

test('a failed save on leave offers to discard and then leaves', async ({ page, context }) => {
  await seedSet(page, email, 'Spanish');
  await openSet(page, 'Spanish');
  await page.keyboard.press('k');
  await expect(count(page)).toHaveText('1/3');

  const dialogs: string[] = [];
  page.on('dialog', (d) => {
    dialogs.push(d.message());
    void d.accept();
  });
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Back' }).first().click();
  await expect(page).toHaveURL(/\/home$/);
  expect(dialogs).toEqual(['Your progress could not be saved. Leave anyway and lose it?']);
});
