import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { createSet, setCard, signUp } from './helpers';

const FRONT = 'Enter text for the front side';
const BACK = 'Enter text for the back side';

const item = (page: Page, index: number) => page.locator('.card-slider__item').nth(index);
const frontBox = (page: Page) => page.getByPlaceholder(FRONT);
const backBox = (page: Page) => page.getByPlaceholder(BACK);
const nextSide = (page: Page) => page.getByRole('button', { name: 'Next: back side' });
const saveNext = (page: Page) => page.getByRole('button', { name: 'Save and add next' });

async function newSet(page: Page, title: string) {
  await page.goto('/add');
  await page.getByRole('button', { name: 'untitled set' }).click();
  await page.getByPlaceholder('untitled set').fill(title);
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Add card' }).click();
}

/** Opens the front text dialog of the first card of a set that has no text yet. */
async function openFirstFront(page: Page) {
  await page.getByText('Example front side of a flashcard').click();
  await expect(frontBox(page)).toBeFocused();
}

/** Types uno / one and dos / two with the keyboard, ending with the second card's back box open. */
async function typeTwoCards(page: Page, first: [string, string] = ['uno', 'one'], second: [string, string] = ['dos', 'two']) {
  await page.keyboard.type(first[0]);
  await page.keyboard.press('Tab');
  await expect(backBox(page)).toBeFocused();
  await page.keyboard.type(first[1]);
  await page.keyboard.press('Control+Enter');
  await expect(frontBox(page)).toBeFocused();
  await page.keyboard.type(second[0]);
  await page.keyboard.press('Tab');
  await expect(backBox(page)).toBeFocused();
  await page.keyboard.type(second[1]);
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

test.beforeEach(async ({ page }) => {
  await signUp(page);
});

test('"Next: back side" switches the dialog to the back, focused', async ({ page }) => {
  await newSet(page, 'Quick');
  await openFirstFront(page);
  await expect(saveNext(page)).toHaveCount(0);

  await frontBox(page).fill('uno');
  await nextSide(page).click();

  await expect(item(page, 0).locator('.flash-card__inner--flipped')).toHaveCount(1);
  await expect(backBox(page)).toBeFocused();
  await expect(frontBox(page)).toHaveCount(0);
});

test('Tab on the front moves to the back, and Shift+Tab still moves focus normally', async ({ page }) => {
  await newSet(page, 'Quick');
  await openFirstFront(page);

  await page.keyboard.press('Shift+Tab');
  await expect(frontBox(page)).not.toBeFocused();
  await expect(frontBox(page)).toBeVisible();
  await expect(item(page, 0).locator('.flash-card__inner--flipped')).toHaveCount(0);

  await frontBox(page).focus();
  await page.keyboard.press('Tab');
  await expect(item(page, 0).locator('.flash-card__inner--flipped')).toHaveCount(1);
  await expect(backBox(page)).toBeFocused();
});

test('the back dialog shows "Save and add next" and not "Next: back side"', async ({ page }) => {
  await newSet(page, 'Quick');
  await openFirstFront(page);
  await page.keyboard.press('Tab');

  await expect(backBox(page)).toBeFocused();
  await expect(saveNext(page)).toBeVisible();
  await expect(nextSide(page)).toHaveCount(0);
});

test('Ctrl+Enter on the back inserts a blank card after this one and opens its front', async ({ page }) => {
  await newSet(page, 'Quick');
  await openFirstFront(page);
  await typeTwoCards(page);
  await page.getByRole('button', { name: 'Done' }).click();

  // Card 1 is still showing its back; open it and add after it.
  await item(page, 0).getByText('one').click();
  await expect(backBox(page)).toBeFocused();
  await page.keyboard.press('Control+Enter');

  await expect(page.locator('.card-slider__item')).toHaveCount(3);
  await expect(frontBox(page)).toBeFocused();
  await expect(frontBox(page)).toHaveValue('');
  await expect(item(page, 1)).toBeInViewport({ ratio: 0.99 });

  await page.keyboard.type('mid');
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(item(page, 1)).toContainText('mid');
  await expect(item(page, 2)).toContainText('two');
});

test('Meta+Enter works the same as Ctrl+Enter, and the button does it too', async ({ page }) => {
  await newSet(page, 'Quick');
  await openFirstFront(page);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Meta+Enter');
  await expect(page.locator('.card-slider__item')).toHaveCount(2);
  await expect(frontBox(page)).toBeFocused();

  await page.keyboard.press('Tab');
  await saveNext(page).click();
  await expect(page.locator('.card-slider__item')).toHaveCount(3);
  await expect(frontBox(page)).toBeFocused();
});

test('typing two cards by keyboard saves both, in order, across a reload', async ({ page }) => {
  await newSet(page, 'Keyboard');
  await openFirstFront(page);
  await typeTwoCards(page);
  await page.getByRole('button', { name: 'Done' }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page).toHaveURL(/\/home$/);

  await page.reload();
  await setCard(page, 'Keyboard').getByText(/browse|review/).click();
  await expect(page.locator('.card-slider__item')).toHaveCount(2);
  await expect(item(page, 0)).toContainText('uno');
  await expect(item(page, 1)).toContainText('dos');
  await item(page, 0).getByRole('button', { name: 'Flip card' }).first().click();
  await expect(item(page, 0).getByText('one')).toBeVisible();
  await item(page, 1).getByRole('button', { name: 'Flip card' }).first().click();
  await expect(item(page, 1).getByText('two')).toBeVisible();
});

test('a set at the size limit refuses the save after a card is added by keyboard', async ({ page }) => {
  await newSet(page, 'Huge');
  await openFirstFront(page);
  // One card past the 900,000-byte cap, set in a single fill rather than typed.
  await frontBox(page).fill('x'.repeat(901_000));
  await page.keyboard.press('Tab');
  await page.keyboard.press('Control+Enter');
  await expect(page.locator('.card-slider__item')).toHaveCount(2);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Save', exact: true }).click();

  await expect(page.getByText('This set is too big to save. Split it into smaller sets.')).toBeVisible();
  await expect(page).toHaveURL(/\/add$/);
});

test('review screen: no buttons and Ctrl+Enter does nothing', async ({ page }) => {
  await createSet(page, 'Review me');
  await page.goto('/home');
  await setCard(page, 'Review me').getByText(/browse|review/).click();
  await expect(page.locator('.card-slider__item')).toHaveCount(1);

  await item(page, 0).getByText('hablar').click();
  await page.keyboard.press('Control+Enter');
  await page.keyboard.press('Meta+Enter');

  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(saveNext(page)).toHaveCount(0);
  await expect(nextSide(page)).toHaveCount(0);
  await expect(page.locator('.card-slider__item')).toHaveCount(1);
});

test('the dialog with the new buttons passes the axe scan', async ({ page }) => {
  await newSet(page, 'Quick');
  await openFirstFront(page);
  await expect(nextSide(page)).toBeVisible();
  await expectNoA11yViolations(page);

  await page.keyboard.press('Tab');
  await expect(saveNext(page)).toBeVisible();
  await expectNoA11yViolations(page);
});
