import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Browser, type Page } from '@playwright/test';
import { createSet, setCard, signUp } from './helpers';
import { DEV_PORTS } from '../../dev-ports';

const DOCS = `http://127.0.0.1:${DEV_PORTS.firestore}/v1/projects/demo-flash-cards/databases/(default)/documents`;

const DESC =
  'Anyone with the link can view this set and copy it into their own library. Your progress is not shared.';
// A Firestore auto id: 20 letters and digits.
const SHARE_LINK = /\/s\/[A-Za-z0-9]{20}$/;

async function expectNoA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const summary = results.violations.map(
    (v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => `${n.target.join(' ')} ${n.any[0]?.message ?? ''}`).join(' | ')}`,
  );
  expect(summary).toEqual([]);
}

async function editSet(page: Page, title: string) {
  await setCard(page, title).getByRole('button', { name: 'Edit' }).click();
  await expect(page).toHaveURL(/\/edit$/);
}

/** Opens the editor's options, presses "Share set" and returns the open dialog. */
async function openShare(page: Page) {
  await page.getByRole('button', { name: 'Options' }).first().click();
  await page.getByRole('button', { name: 'Share set' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText(DESC)).toBeVisible();
  return dialog;
}

async function shareLink(page: Page) {
  const dialog = await openShare(page);
  const link = dialog.getByText(SHARE_LINK);
  await expect(link).toBeVisible();
  return (await link.innerText()).trim();
}

/** Reads a link's public copy from the emulator as a signed-out visitor would: its title, or null once it's gone. */
async function publicTitle(page: Page, link: string): Promise<string | null> {
  const shareId = link.split('/').pop();
  const response = await page.request.get(`${DOCS}/shared-sets/${shareId}`);
  if (response.status() === 404) {
    return null;
  }
  expect(response.ok()).toBe(true);
  const { fields } = (await response.json()) as { fields: { title: { stringValue: string } } };
  return fields.title.stringValue;
}

async function rename(page: Page, from: string, to: string) {
  await page.getByRole('button', { name: new RegExp(`^${from}$`, 'i') }).click();
  await page.getByPlaceholder('untitled set').fill(to);
  await page.keyboard.press('Enter');
}

/** Opens `link` in a new, signed-out browser context. */
async function openSignedOut(browser: Browser, link: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(link);
  return { context, page };
}

test.beforeEach(async ({ page }) => {
  await signUp(page);
  await createSet(page, 'Spanish verbs');
  await editSet(page, 'Spanish verbs');
});

test('sharing a set shows its link, and Copy link copies it', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const link = await shareLink(page);
  expect(link.startsWith(new URL(page.url()).origin)).toBe(true);

  await page.getByRole('dialog').getByRole('button', { name: 'Copy link' }).click();
  await expect(page.getByText('Link copied')).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(link);
});

test('sharing a shared set again shows the same link', async ({ page }) => {
  const first = await shareLink(page);
  await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();

  expect(await shareLink(page)).toBe(first);
  // The share state survives a reload: it is stored with the set.
  await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();
  await page.reload();
  expect(await shareLink(page)).toBe(first);
});

test('Stop sharing says the old link no longer works, and sharing again makes a new link', async ({ page }) => {
  const first = await shareLink(page);
  expect(await publicTitle(page, first)).toBe('Spanish verbs');
  await page.getByRole('dialog').getByRole('button', { name: 'Stop sharing' }).click();
  await expect(page.getByText('Stopped sharing. The old link no longer works.')).toBeVisible();
  await expect(page.getByRole('dialog')).toBeHidden();
  expect(await publicTitle(page, first)).toBeNull();

  const second = await shareLink(page);
  expect(second).not.toBe(first);
});

test('saving a shared set updates its public copy, unsaved edits first', async ({ page }) => {
  // An edit made before sharing is saved first, so the copy starts out matching it.
  await rename(page, 'Spanish verbs', 'Spanish verbs 1');
  const link = await shareLink(page);
  expect(await publicTitle(page, link)).toBe('Spanish verbs 1');
  await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();

  await rename(page, 'Spanish verbs 1', 'Spanish verbs 2');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect.poll(() => publicTitle(page, link)).toBe('Spanish verbs 2');
});

test('offline, Share set is refused with the offline message', async ({ page, context }) => {
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Options' }).first().click();
  await page.getByRole('button', { name: 'Share set' }).click();
  await expect(page.getByText("You're offline. Connect to the internet to save.")).toBeVisible();
  await expect(page.getByRole('dialog')).toBeHidden();
  await context.setOffline(false);
});

test('the share dialog passes the axe scan at 390 px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await shareLink(page);
  // Let the dialog's opening transition finish before scanning.
  await expect(page.getByRole('dialog')).toHaveCSS('opacity', '1');
  await expectNoA11yViolations(page);
});

test('saving a shared set updates what its link shows', async ({ page, browser }) => {
  const link = await shareLink(page);
  await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();
  await rename(page, 'Spanish verbs', 'Spanish verbs 2');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page).toHaveURL(/\/home$/);
  // The save doesn't wait for the public copy's update; the link page reads the copy once.
  await expect.poll(() => publicTitle(page, link)).toBe('Spanish verbs 2');

  const visitor = await openSignedOut(browser, link);
  await expect(visitor.page.getByRole('heading', { name: 'Spanish verbs 2' })).toBeVisible();
  await visitor.context.close();
});

test('a link that has stopped sharing shows that it does not work', async ({ page, browser }) => {
  const link = await shareLink(page);
  await page.getByRole('dialog').getByRole('button', { name: 'Stop sharing' }).click();
  await expect(page.getByText('Stopped sharing. The old link no longer works.')).toBeVisible();

  const visitor = await openSignedOut(browser, link);
  await expect(visitor.page.getByText("This link doesn't work")).toBeVisible();
  await visitor.context.close();
});
