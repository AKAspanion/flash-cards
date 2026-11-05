import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { PASSWORD, createSet, setCard, signUp, uniqueEmail } from './helpers';
import { DEV_PORTS } from '../../dev-ports';

const DOCS = `http://127.0.0.1:${DEV_PORTS.firestore}/v1/projects/demo-flash-cards/databases/(default)/documents`;
// The emulator owner token bypasses the security rules, as a stranger writing the copy directly could.
const OWNER = { Authorization: 'Bearer owner' };

const MISSING_TITLE = "This link doesn't work";
const MISSING_SUBTITLE = 'The owner may have stopped sharing it.';
const ADDED = 'Added to your library';
const OFFLINE = "You're offline. Connect to the internet to save.";

type Pair = [front: string, back: string];

const SEVEN: Pair[] = Array.from({ length: 7 }, (_, i): Pair => [`front ${i + 1}`, `back ${i + 1}`]);

/** A Firestore-style auto id: 20 letters and digits. */
function shareIdLike(): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 20 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
}

/** Writes a public copy straight into the emulator and returns its link path. */
async function seedShared(page: Page, title: string, pairs: Pair[], color = '#3F51B5'): Promise<string> {
  const shareId = shareIdLike();
  const cards = pairs.map(([front, back], i) => ({
    id: `card-${i + 1}`,
    front,
    back,
    learned: false,
    date: '2026-01-01T00:00:00.000Z',
  }));
  const response = await page.request.post(`${DOCS}/shared-sets?documentId=${shareId}`, {
    headers: OWNER,
    data: {
      fields: {
        ownerUid: { stringValue: 'someone-else' },
        title: { stringValue: title },
        color: { stringValue: color },
        cards: { stringValue: JSON.stringify(cards) },
        updatedAt: { timestampValue: new Date().toISOString() },
      },
    },
  });
  expect(response.ok()).toBe(true);
  return `/s/${shareId}`;
}

const previewCards = (page: Page) => page.locator('.shared__card');
const addButton = (page: Page) => page.getByRole('button', { name: 'Add to my library' });

async function expectSharedPage(page: Page, title: string, count: string, shown: number) {
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  await expect(page.getByText(count, { exact: true })).toBeVisible();
  await expect(previewCards(page)).toHaveCount(shown);
  await expect(addButton(page)).toBeVisible();
}

async function expectMissing(page: Page) {
  await expect(page.getByText(MISSING_TITLE)).toBeVisible();
  await expect(page.getByText(MISSING_SUBTITLE)).toBeVisible();
  await expect(addButton(page)).toHaveCount(0);
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

/** Home's set cards, once the library has loaded (either its sets or its empty state). */
async function homeSetCount(page: Page): Promise<number> {
  await page.goto('/home');
  await expect(page.locator('.set-card').first().or(page.getByText('Welcome to your flashcards library!'))).toBeVisible();
  return page.locator('.set-card').count();
}

test.describe('viewing a link', () => {
  test('a signed-out visitor sees the title, the count, five cards and Add to my library', async ({ page }) => {
    const link = await seedShared(page, 'Spanish verbs', SEVEN);
    await page.goto(link);
    await expectSharedPage(page, 'Spanish verbs', '7 cards', 5);
    await expect(previewCards(page).first()).toContainText('front 1');
    await expect(previewCards(page).first()).toContainText('back 1');
    await expect(page.getByText('front 6')).toHaveCount(0);
    await expect(page).toHaveURL(new RegExp(`${link}$`));
  });

  test('a signed-in visitor who is not the owner sees the same and stays on the link', async ({ page }) => {
    const link = await seedShared(page, 'Spanish verbs', SEVEN);
    await signUp(page);
    await page.goto(link);
    await expectSharedPage(page, 'Spanish verbs', '7 cards', 5);
    await expect(page).toHaveURL(new RegExp(`${link}$`));
  });

  test('a set of one card says "1 card"', async ({ page }) => {
    const link = await seedShared(page, 'Single', [['uno', 'one']]);
    await page.goto(link);
    await expectSharedPage(page, 'Single', '1 card', 1);
  });
});

test.describe('hostile content', () => {
  test('card text is rendered as Markdown', async ({ page }) => {
    const link = await seedShared(page, 'Markdown', [['**bold** and *italic*', 'plain']]);
    await page.goto(link);
    await expect(previewCards(page).locator('strong')).toHaveText('bold');
    await expect(previewCards(page).locator('em')).toHaveText('italic');
  });

  test('raw HTML in a card is shown as text and never runs', async ({ page }) => {
    const html = '<img src=x onerror="window.__xss=1">';
    const link = await seedShared(page, 'Html', [[html, 'back']]);
    await page.goto(link);
    await expect(previewCards(page).getByText(html)).toBeVisible();
    await expect(previewCards(page).locator('img')).toHaveCount(0);
    expect(await page.evaluate(() => (window as { __xss?: unknown }).__xss)).toBeUndefined();
  });

  test('javascript: links and protocol-relative images are dropped', async ({ page }) => {
    const link = await seedShared(page, 'Links', [
      ['link card', '[click](javascript:window.__xss=1)'],
      ['![](//evil.example/x.png)', 'image card'],
    ]);
    await page.goto(link);
    await expect(previewCards(page).getByText('click')).toBeVisible();
    await expect(previewCards(page).getByText('image card')).toBeVisible();
    await expect(page.locator('a[href^="javascript:" i]')).toHaveCount(0);
    await expect(page.locator('img[src^="//"]')).toHaveCount(0);
    await previewCards(page).getByText('click').click();
    expect(await page.evaluate(() => (window as { __xss?: unknown }).__xss)).toBeUndefined();
  });

  test('a title holding HTML is shown literally', async ({ page }) => {
    const title = '<b onmouseover="window.__xss=1">T</b>';
    const link = await seedShared(page, title, [['uno', 'one']]);
    await page.goto(link);
    const heading = page.getByRole('heading', { name: title });
    await expect(heading).toBeVisible();
    await expect(heading.locator('b')).toHaveCount(0);
    await heading.hover();
    expect(await page.evaluate(() => (window as { __xss?: unknown }).__xss)).toBeUndefined();
  });
});

test.describe('links that do not work', () => {
  test('a malformed id shows the missing-link state without asking Firestore', async ({ page }) => {
    const firestoreRequests: string[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).port === String(DEV_PORTS.firestore)) {
        firestoreRequests.push(request.url());
      }
    });
    await page.goto('/s/not-a-valid-id!');
    await expectMissing(page);
    expect(firestoreRequests).toEqual([]);
  });

  test('a well-formed id with no copy shows the missing-link state', async ({ page }) => {
    await page.goto(`/s/${shareIdLike()}`);
    await expectMissing(page);
  });

  test('a set moved to the bin and deleted forever takes its link with it', async ({ page, browser }) => {
    await signUp(page);
    await createSet(page, 'Old notes');
    await setCard(page, 'Old notes').getByRole('button', { name: 'Edit' }).click();
    await page.getByRole('button', { name: 'Options' }).first().click();
    await page.getByRole('button', { name: 'Share set' }).click();
    const linkText = page.getByRole('dialog').getByText(/\/s\/[A-Za-z0-9]{20}$/);
    await expect(linkText).toBeVisible();
    const link = (await linkText.innerText()).trim();
    await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();

    await page.getByRole('button', { name: 'Options' }).first().click();
    await page.getByRole('button', { name: 'Move to bin' }).click();
    await expect(page).toHaveURL(/\/home$/);
    await page.goto('/bin');
    await setCard(page, 'Old notes').getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
    await expect(setCard(page, 'Old notes')).toHaveCount(0);

    const context = await browser.newContext();
    const visitor = await context.newPage();
    await visitor.goto(link);
    await expectMissing(visitor);
    await context.close();
  });

  test('a failed load shows the error state, and Retry fetches again', async ({ page }) => {
    const link = await seedShared(page, 'Spanish verbs', SEVEN);
    await page.route('**/google.firestore.v1.Firestore/**', (route) => route.abort('internetdisconnected'));
    await page.goto(link);
    await expect(page.getByText("Couldn't load your flashcards")).toBeVisible();
    await expect(page.getByText('Check your connection and try again.')).toBeVisible();

    await page.unroute('**/google.firestore.v1.Firestore/**');
    // Firestore reconnects on its own backoff, so a retry pressed too early may fail again.
    await expect(async () => {
      await page.getByRole('button', { name: 'Retry' }).click();
      await expect(page.getByRole('heading', { name: 'Spanish verbs' })).toBeVisible({ timeout: 3_000 });
    }).toPass({ timeout: 30_000 });
    await expect(page.getByText('7 cards', { exact: true })).toBeVisible();
  });
});

test.describe('Add to my library', () => {
  test('signed in, it copies the set without labels and opens the review', async ({ page }) => {
    const link = await seedShared(page, 'Spanish verbs', SEVEN);
    await signUp(page);
    await page.goto(link);
    await addButton(page).click();
    await expect(page.getByText(ADDED)).toBeVisible();
    await expect(page).toHaveURL(/\/_[0-9a-f-]{36}\/view$/);

    await page.goto('/home');
    await expect(setCard(page, 'Spanish verbs')).toContainText('0 / 7');
    await expect(setCard(page, 'Spanish verbs').locator('.set-card__labels .v-chip')).toHaveCount(0);
  });

  test('signed out, it goes through sign-up and comes back to finish the copy once', async ({ page }) => {
    const link = await seedShared(page, 'Spanish verbs', SEVEN);
    await page.goto(link);
    await addButton(page).click();
    await expect(page).toHaveURL(new RegExp(`/login\\?redirect=${link}$`));

    await page.getByRole('button', { name: 'Sign up' }).click();
    await page.getByLabel('Email').fill(uniqueEmail());
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByLabel('Re-enter password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign up' }).click();

    await expect(page.getByText(ADDED)).toBeVisible();
    await expect(page).toHaveURL(/\/_[0-9a-f-]{36}\/view$/);
    expect(await page.evaluate(() => sessionStorage.getItem('pending-share-add'))).toBeNull();

    // Opening the link again, or reloading Home, adds nothing more.
    await page.goto(link);
    await expect(addButton(page)).toBeVisible();
    await page.goto('/home');
    await page.reload();
    await expect(setCard(page, 'Spanish verbs')).toHaveCount(1);
    expect(await homeSetCount(page)).toBe(1);
  });

  test('a link opened signed in never adds a set by itself', async ({ page }) => {
    const link = await seedShared(page, 'Spanish verbs', SEVEN);
    await signUp(page);
    // A pending add for another link does not count for this one.
    await page.evaluate(() => sessionStorage.setItem('pending-share-add', 'SomeOtherShareId1234'));
    await page.goto(link);
    await expectSharedPage(page, 'Spanish verbs', '7 cards', 5);
    expect(await homeSetCount(page)).toBe(0);
  });

  test('offline, it is refused with the offline message and nothing is added', async ({ page, context }) => {
    const link = await seedShared(page, 'Spanish verbs', SEVEN);
    await signUp(page);
    await page.goto(link);
    await expect(addButton(page)).toBeVisible();
    await context.setOffline(true);
    await addButton(page).click();
    await expect(page.getByText(OFFLINE)).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${link}$`));
    await context.setOffline(false);
    expect(await homeSetCount(page)).toBe(0);
  });
});

test.describe('accessibility at 390 px', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
  });

  test('signed out', async ({ page }) => {
    const link = await seedShared(page, 'Spanish verbs', SEVEN);
    await page.goto(link);
    await expectSharedPage(page, 'Spanish verbs', '7 cards', 5);
    await expectNoA11yViolations(page);
  });

  test('signed in', async ({ page }) => {
    const link = await seedShared(page, 'Spanish verbs', SEVEN);
    await signUp(page);
    await page.goto(link);
    await expectSharedPage(page, 'Spanish verbs', '7 cards', 5);
    await expectNoA11yViolations(page);
  });
});
