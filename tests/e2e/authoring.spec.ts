import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { createSet, setCard, signUp } from './helpers';
import { signedInUid } from './stats-helpers';
import { DEV_PORTS } from '../../dev-ports';

const DOCS = `http://127.0.0.1:${DEV_PORTS.firestore}/v1/projects/demo-flash-cards/databases/(default)/documents`;
// The emulator owner token bypasses the security rules.
const OWNER = { Authorization: 'Bearer owner' };

/**
 * Writes a set straight into the emulator whose cards are just over the app's 900,000-byte limit,
 * so the app shows it but refuses any new set made from it.
 */
async function seedOversizedSet(page: Page, title: string) {
  const uid = await signedInUid(page);
  const cards = [{ id: 'card-1', front: 'word '.repeat(181_000), back: 'back', learned: false, date: '2026-01-01T00:00:00.000Z' }];
  const response = await page.request.post(`${DOCS}/flash-card-sets`, {
    headers: OWNER,
    data: {
      fields: {
        id: { stringValue: `seed-${Date.now()}` },
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

test.beforeEach(async ({ page }) => {
  await signUp(page);
});

async function openOptions(page: Page) {
  await page.getByRole('button', { name: 'Options' }).first().click();
}

async function openImport(page: Page) {
  await openOptions(page);
  await page.getByRole('button', { name: 'Import cards' }).click();
}

function pasteBox(page: Page) {
  return page.getByLabel('Paste cards, one per line');
}

function addCardsButton(page: Page) {
  return page.getByRole('button', { name: 'Add cards' });
}

async function editSet(page: Page, title: string) {
  await setCard(page, title).getByRole('button', { name: 'Edit' }).click();
  await expect(page).toHaveURL(/\/edit$/);
}

/** Builds a set from pasted lines through the import dialog, saves it and lands on Home. */
async function createSetByImport(page: Page, title: string, lines: string[]) {
  await page.goto('/add');
  await page.getByRole('button', { name: 'untitled set' }).click();
  await page.getByPlaceholder('untitled set').fill(title);
  await page.keyboard.press('Enter');
  await openImport(page);
  await pasteBox(page).fill(lines.join('\n'));
  await addCardsButton(page).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(setCard(page, title)).toBeVisible();
}

async function reorderTexts(page: Page) {
  await openOptions(page);
  await page.getByRole('button', { name: 'Reorder cards' }).click();
  const texts = await page.locator('.reorder__text').allInnerTexts();
  return texts;
}

async function unsavedChanges(page: Page) {
  return page.evaluate(
    () =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (document.querySelector('#app') as any).__vue_app__.config.globalProperties.$pinia.state.value.session
        .unsavedChanges as boolean,
  );
}

test.describe('import', () => {
  test('pasted lines are added after the existing cards and survive a reload', async ({ page }) => {
    await createSet(page, 'Spanish verbs');
    await editSet(page, 'Spanish verbs');
    await openImport(page);
    await pasteBox(page).fill('hola\thello\ngato;cat');
    await expect(page.getByText('2 cards ready to add')).toBeVisible();
    await addCardsButton(page).click();
    expect(await reorderTexts(page)).toEqual(['hablar', 'hola', 'gato']);
    await page.getByRole('button', { name: 'Close' }).last().click();
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page).toHaveURL(/\/home$/);
    await page.reload();
    await expect(setCard(page, 'Spanish verbs')).toContainText('0 / 3');
  });

  test('a single card is singular', async ({ page }) => {
    await page.goto('/add');
    await openImport(page);
    await pasteBox(page).fill('hola\thello');
    await expect(page.getByText('1 card ready to add')).toBeVisible();
  });

  test('skipped lines are listed and only valid cards are added', async ({ page }) => {
    await page.goto('/add');
    await openImport(page);
    await pasteBox(page).fill('a\tb\nno separator\nc\td');
    await expect(page.getByText('1 line skipped (no back side): line 2')).toBeVisible();
    await expect(page.getByText('2 cards ready to add')).toBeVisible();
    await pasteBox(page).fill('a\tb\nno separator\nc\td\ne\tf\nalso none');
    await expect(page.getByText('2 lines skipped (no back side): lines 2, 5')).toBeVisible();
    await addCardsButton(page).click();
    expect(await reorderTexts(page)).toEqual(['a', 'c', 'e']);
  });

  test('Add cards is disabled when there is no valid line', async ({ page }) => {
    await page.goto('/add');
    await openImport(page);
    await expect(addCardsButton(page)).toBeDisabled();
    await pasteBox(page).fill('no separator');
    await expect(addCardsButton(page)).toBeDisabled();
  });

  test('more than 1,000 cards imports nothing', async ({ page }) => {
    await page.goto('/add');
    await openImport(page);
    const lines = Array.from({ length: 1001 }, (_, i) => `front ${i}\tback ${i}`);
    await pasteBox(page).fill(lines.join('\n'));
    await expect(page.getByText('You can import up to 1,000 cards at a time.')).toBeVisible();
    await expect(addCardsButton(page)).toBeDisabled();
  });

  test('a file over 2 MB is refused', async ({ page }) => {
    await page.goto('/add');
    await openImport(page);
    await page.locator('input[type="file"]').setInputFiles({
      name: 'big.txt',
      mimeType: 'text/plain',
      buffer: Buffer.alloc(2 * 1024 * 1024 + 1, 'a'),
    });
    await expect(page.getByText('That file is too big. The limit is 2 MB.')).toBeVisible();
    await expect(addCardsButton(page)).toBeDisabled();
  });

  test('a CSV file with a header and quoted rows is read', async ({ page }) => {
    await page.goto('/add');
    await openImport(page);
    await page.locator('input[type="file"]').setInputFiles({
      name: 'cards.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('FRONT,BACK\r\n"one, uno","1"\r\n"two ""dos""","2"\r\n'),
    });
    await expect(page.getByText('2 cards ready to add')).toBeVisible();
  });

  test('this set\'s own CSV export imports into another set without a header card', async ({ page }) => {
    await createSetByImport(page, 'Source', ['uno\tone', 'dos\ttwo']);
    await editSet(page, 'Source');
    await openOptions(page);
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export as CSV' }).click();
    const file = await download;
    const content = readFileSync(await file.path());

    await page.goto('/add');
    await openImport(page);
    await page.locator('input[type="file"]').setInputFiles({ name: 'Source.csv', mimeType: 'text/csv', buffer: content });
    await expect(page.getByText('2 cards ready to add')).toBeVisible();
    await addCardsButton(page).click();
    expect(await reorderTexts(page)).toEqual(['uno', 'dos']);
  });

  test('a set that becomes too big is refused on save and the editor keeps the cards', async ({ page }) => {
    await page.goto('/add');
    await openImport(page);
    const big = 'x'.repeat(500);
    const lines = Array.from({ length: 1000 }, (_, i) => `${i} ${big}\t${big}`);
    await pasteBox(page).fill(lines.join('\n'));
    await addCardsButton(page).click();
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('This set is too big to save. Split it into smaller sets.')).toBeVisible();
    await expect(page).toHaveURL(/\/add$/);
    expect(await reorderTexts(page)).toHaveLength(1000);
  });
});

test.describe('export', () => {
  test('CSV and JSON downloads are named after the set', async ({ page }) => {
    await createSet(page, 'Spanish verbs');
    await editSet(page, 'Spanish verbs');

    await openOptions(page);
    let pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export as CSV' }).click();
    let file = await pending;
    expect(file.suggestedFilename()).toBe('Spanish-verbs.csv');
    expect(readFileSync(await file.path(), 'utf8').startsWith('﻿front,back,learned')).toBe(true);

    await openOptions(page);
    pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export as JSON' }).click();
    file = await pending;
    expect(file.suggestedFilename()).toBe('Spanish-verbs.json');
  });
});

test.describe('duplicate', () => {
  test('is not offered for a set that was never saved', async ({ page }) => {
    await page.goto('/add');
    await openOptions(page);
    await expect(page.getByRole('button', { name: 'Import cards' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Duplicate set' })).toHaveCount(0);
  });

  test('copies cards with progress cleared, not a favourite', async ({ page }) => {
    await createSet(page, 'Spanish verbs');
    await setCard(page, 'Spanish verbs').getByText('browse').click();
    await page.getByRole('button', { name: 'Mark as learned' }).click();
    await page.goBack();
    await expect(setCard(page, 'Spanish verbs')).toContainText('1 / 1');

    await editSet(page, 'Spanish verbs');
    await openOptions(page);
    await page.getByRole('button', { name: 'Mark favourite' }).click();
    // The options panel stays open after a toggle and covers the Save button; close it first.
    await openOptions(page);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page).toHaveURL(/\/home$/);

    await editSet(page, 'Spanish verbs');
    await openOptions(page);
    await page.getByRole('button', { name: 'Duplicate set' }).click();
    await expect(page).toHaveURL(/\/edit$/);
    await expect(page.getByRole('button', { name: 'Spanish verbs (copy)' })).toBeVisible();
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page).toHaveURL(/\/home$/);

    await expect(setCard(page, 'Spanish verbs (copy)')).toContainText('0 / 1');
    // Every card holds a hidden swipe-action star; only the one beside the title marks a favourite.
    const favStar = '.mdi-star:not(.set-card__hidden-icon)';
    await expect(setCard(page, 'Spanish verbs (copy)').locator(favStar)).toHaveCount(0);
    await expect(setCard(page, 'Spanish verbs').filter({ hasNotText: '(copy)' }).locator(favStar)).toHaveCount(1);
  });

  test('an untitled set is copied as "untitled set (copy)"', async ({ page }) => {
    await page.goto('/add');
    await openImport(page);
    await pasteBox(page).fill('a\tb');
    await addCardsButton(page).click();
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page).toHaveURL(/\/home$/);

    await page.locator('.set-card').first().getByRole('button', { name: 'Edit' }).click();
    await openOptions(page);
    await page.getByRole('button', { name: 'Duplicate set' }).click();
    await expect(page.getByRole('button', { name: 'untitled set (copy)' })).toBeVisible();
  });

  test('a failed copy leaves the editor on the original set', async ({ page }) => {
    // Offline, a copy now saves on the device (offline study), so the copy is made to fail on size instead.
    await seedOversizedSet(page, 'Huge set');
    await page.goto('/home');
    await editSet(page, 'Huge set');
    const url = page.url();
    await openOptions(page);
    await page.getByRole('button', { name: 'Duplicate set' }).click();
    await expect(page.getByText('This set is too big to save. Split it into smaller sets.')).toBeVisible();
    expect(page.url()).toBe(url);
    await expect(page.getByRole('button', { name: 'Huge set', exact: true })).toBeVisible();
  });
});

test.describe('reorder', () => {
  test('moving a card down is applied on close and kept after a reload', async ({ page }) => {
    await createSetByImport(page, 'Letters', ['A\t1', 'B\t2', 'C\t3']);
    await editSet(page, 'Letters');
    await openOptions(page);
    await page.getByRole('button', { name: 'Reorder cards' }).click();
    await page.getByRole('button', { name: 'Move down: A' }).click();
    await page.getByRole('button', { name: 'Close' }).last().click();
    expect(await reorderTexts(page)).toEqual(['B', 'A', 'C']);
    await page.getByRole('button', { name: 'Close' }).last().click();

    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page).toHaveURL(/\/home$/);
    await page.reload();
    await setCard(page, 'Letters').getByText('browse').click();
    await expect(page.getByText('B', { exact: true })).toBeVisible();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByText('A', { exact: true })).toBeVisible();
  });

  test('the first row cannot move up and the last cannot move down', async ({ page }) => {
    await createSetByImport(page, 'Letters', ['A\t1', 'B\t2']);
    await editSet(page, 'Letters');
    await openOptions(page);
    await page.getByRole('button', { name: 'Reorder cards' }).click();
    await expect(page.getByRole('button', { name: 'Move up: A' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Move down: B' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Move down: A' })).toBeEnabled();
  });

  test('opening and closing without a move is not a change', async ({ page }) => {
    await createSetByImport(page, 'Letters', ['A\t1', 'B\t2']);
    await editSet(page, 'Letters');
    await openOptions(page);
    await page.getByRole('button', { name: 'Reorder cards' }).click();
    await page.getByRole('button', { name: 'Close' }).last().click();
    await expect(page.locator('.reorder__list')).toBeHidden();
    expect(await unsavedChanges(page)).toBe(false);
  });
});

test.describe('add card', () => {
  const addCardButton = (page: Page) => page.getByRole('button', { name: 'Add card', exact: true });
  const numberIn = (page: Page, n: number) =>
    page.locator('.flash-card__number').filter({ hasText: new RegExp(`^\\s*${n}\\s*$`) });

  test('the first card of a new set is numbered 1', async ({ page }) => {
    await page.goto('/add');
    await addCardButton(page).click();
    expect(await reorderTexts(page)).toEqual(['-']);
    await page.getByRole('button', { name: 'Close' }).last().click();
    await expect(numberIn(page, 1)).toBeInViewport();
  });

  test('a new card goes right after the focused first card and is brought into view', async ({ page }) => {
    await createSetByImport(page, 'Letters', ['A\t1', 'B\t2', 'C\t3']);
    await editSet(page, 'Letters');
    await addCardButton(page).click();
    await expect(numberIn(page, 2)).toBeInViewport();
    expect(await reorderTexts(page)).toEqual(['A', '-', 'B', 'C']);
  });

  /**
   * Swipes the editor's card slider to its end, as a user does, and waits until the slider has
   * settled there. The slider takes its focused card from the scroll position
   * (`round(scrollLeft / card width)`, GroupCardFlash's updateFocused), so this waits for that to
   * name `index`, then for the scroll event that reports it.
   */
  async function swipeToLastCard(page: Page, index: number) {
    const slider = page.locator('.card-slider');
    await expect(slider.locator('.card-slider__item')).toHaveCount(index + 1);
    await slider.evaluate((el) => el.scrollTo({ left: el.scrollWidth }));
    await expect
      .poll(() =>
        slider.evaluate((el) => {
          const card = el.querySelector('.card-slider__item')!.getBoundingClientRect().width;
          const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
          return atEnd ? Math.round(el.scrollLeft / card) : -1;
        }),
      )
      .toBe(index);
    await slider.evaluate(
      () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
    );
  }

  test('with the last card focused the new card goes last', async ({ page }) => {
    await createSetByImport(page, 'Letters', ['A\t1', 'B\t2', 'C\t3']);
    await editSet(page, 'Letters');
    await swipeToLastCard(page, 2);
    await expect(numberIn(page, 3)).toBeInViewport();
    await addCardButton(page).click();
    await expect(numberIn(page, 4)).toBeInViewport();
    expect(await reorderTexts(page)).toEqual(['A', 'B', 'C', '-']);
  });

  test('two quick taps insert one after the other', async ({ page }) => {
    await createSetByImport(page, 'Letters', ['A\t1', 'B\t2']);
    await editSet(page, 'Letters');
    await addCardButton(page).click();
    await addCardButton(page).click();
    await expect(numberIn(page, 3)).toBeInViewport();
    expect(await reorderTexts(page)).toEqual(['A', '-', '-', 'B']);
  });
});

test('the editor with a dialog open is accessible at 390 px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/add');
  await openImport(page);
  await expect(page.getByLabel('Paste cards, one per line')).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
});
