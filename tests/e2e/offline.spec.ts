import { expect, test, type Locator, type Page } from '@playwright/test';
import { createSet, setCard, signUp } from './helpers';
import { DEV_PORTS } from '../../dev-ports';

// Service workers are blocked in e2e (playwright.config.ts), so nothing can serve a page load offline.
// Each test loads the app online, opens every page it needs once (so its lazy chunk is in memory),
// then goes offline and moves only inside the loaded app.

const AUTH = `http://127.0.0.1:${DEV_PORTS.auth}`;
const FIRESTORE = `http://127.0.0.1:${DEV_PORTS.firestore}`;
const PROJECT = 'demo-flash-cards';
const DOCS = `${FIRESTORE}/v1/projects/${PROJECT}/databases/(default)/documents`;
const OWNER = { Authorization: 'Bearer owner' };

const OFFLINE_SAVED = "Saved on this device. It will sync when you're back online.";
const OFFLINE_SAVE = "You're offline. Connect to the internet to save.";
const OFFLINE_DELETE = "You're offline. Connect to the internet to delete this set.";
// Every set card holds a hidden swipe-action star; only the one beside the title marks a favourite.
const FAV_STAR = '.mdi-star:not(.set-card__hidden-icon)';

/** The Auth emulator's own record of the account, so a check sees what reached the server. */
async function accountFor(page: Page, email: string): Promise<{ localId: string; displayName?: string }> {
  const response = await page.request.post(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:query`, {
    headers: OWNER,
    data: {},
  });
  const { userInfo } = (await response.json()) as { userInfo: { localId: string; email: string; displayName?: string }[] };
  const found = userInfo.find((u) => u.email === email);
  if (!found) {
    throw new Error(`No emulator account for ${email}`);
  }
  return found;
}

async function uidFor(page: Page, email: string): Promise<string> {
  return (await accountFor(page, email)).localId;
}

/** Writes a one-card set straight into the emulator (rules bypassed). */
async function seedSet(page: Page, email: string, title: string, options: { trashed?: boolean } = {}) {
  const uid = await uidFor(page, email);
  const cards = [{ id: 'card-1', front: 'hablar', back: 'to speak', learned: false, date: '2026-01-01T00:00:00.000Z' }];
  const response = await page.request.post(`${DOCS}/flash-card-sets`, {
    headers: OWNER,
    data: {
      fields: {
        id: { stringValue: `seed-${title}` },
        uid: { stringValue: uid },
        title: { stringValue: title },
        color: { stringValue: '#E91E63' },
        date: { timestampValue: new Date().toISOString() },
        trashed: { booleanValue: options.trashed ?? false },
        fav: { booleanValue: false },
        labels: { arrayValue: {} },
        cards: { stringValue: JSON.stringify(cards) },
      },
    },
  });
  expect(response.ok()).toBe(true);
}

interface StoredSet {
  title: string;
  trashed: boolean;
  fav: boolean;
  cards: { learned: boolean }[];
}

/** Reads the person's sets from the emulator itself, so a check sees what reached the server. */
async function storedSets(page: Page, email: string): Promise<StoredSet[]> {
  const uid = await uidFor(page, email);
  const response = await page.request.post(`${DOCS}:runQuery`, {
    headers: OWNER,
    data: {
      structuredQuery: {
        from: [{ collectionId: 'flash-card-sets' }],
        where: { fieldFilter: { field: { fieldPath: 'uid' }, op: 'EQUAL', value: { stringValue: uid } } },
      },
    },
  });
  type Fields = {
    title: { stringValue: string };
    trashed?: { booleanValue: boolean };
    fav?: { booleanValue: boolean };
    cards: { stringValue: string };
  };
  const rows = (await response.json()) as { document?: { fields: Fields } }[];
  return rows
    .filter((r) => r.document)
    .map(({ document }) => {
      const f = (document as { fields: Fields }).fields;
      return {
        title: f.title.stringValue,
        trashed: f.trashed?.booleanValue ?? false,
        fav: f.fav?.booleanValue ?? false,
        cards: JSON.parse(f.cards.stringValue) as { learned: boolean }[],
      };
    });
}

/** Reads the person's label names from the emulator itself, so a check sees what reached the server. */
async function storedLabels(page: Page, email: string): Promise<string[]> {
  const uid = await uidFor(page, email);
  const response = await page.request.post(`${DOCS}:runQuery`, {
    headers: OWNER,
    data: {
      structuredQuery: {
        from: [{ collectionId: 'labels' }],
        where: { fieldFilter: { field: { fieldPath: 'uid' }, op: 'EQUAL', value: { stringValue: uid } } },
      },
    },
  });
  const rows = (await response.json()) as { document?: { fields: { label: { stringValue: string } } } }[];
  return rows.flatMap((r) => (r.document ? [r.document.fields.label.stringValue] : []));
}

/** Moves inside the loaded app the way the router does on browser back/forward: no page load. */
async function goInApp(page: Page, path: string) {
  await page.evaluate((to) => {
    history.pushState(history.state, '', to);
    dispatchEvent(new PopStateEvent('popstate', { state: history.state }));
  }, path);
}

async function openStudy(page: Page, title: string) {
  await setCard(page, title).getByText(/browse|review/).click();
  await expect(page.locator('.card-slider__item')).not.toHaveCount(0);
}

/** On the only card the top-left button reads "Done" and opens the summary; its "Back to home" leaves. */
async function leaveFromLastCard(page: Page) {
  const dialog = page.getByRole('dialog');
  if (!(await dialog.isVisible())) {
    await page.getByRole('button', { name: 'Back' }).first().click();
  }
  await dialog.getByRole('button', { name: 'Back to home' }).click();
  await expect(page).toHaveURL(/\/home$/);
}

/** Opens the study page once online so its chunk is loaded, and comes back to Home. */
async function warmStudyPage(page: Page, title: string) {
  await openStudy(page, title);
  await leaveFromLastCard(page);
}

async function openEditor(page: Page, title: string) {
  await setCard(page, title).getByRole('button', { name: 'Edit' }).click();
  await expect(page).toHaveURL(/\/edit$/);
  await expect(page.getByRole('button', { name: title })).toBeVisible();
}

async function openEditorOptions(page: Page) {
  await page.getByRole('button', { name: 'Options' }).first().click();
  await expect(page.getByRole('button', { name: 'Mark favourite' })).toBeVisible();
}

/** Drags a set card 90 px to the right with touch events, past the 62 px that marks it favourite. */
async function swipeRight(card: Locator) {
  await card.locator('.set-card__swipe').evaluate((el) => {
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const at = (dx: number) => new Touch({ identifier: 1, target: el, clientX: x + dx, clientY: y });
    el.dispatchEvent(new TouchEvent('touchstart', { touches: [at(0)], changedTouches: [at(0)], bubbles: true }));
    el.dispatchEvent(new TouchEvent('touchmove', { touches: [at(90)], changedTouches: [at(90)], bubbles: true }));
    el.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [at(90)], bubbles: true, cancelable: true }));
  });
}

/** Counts each time the offline-saved snack appears, from now on. */
async function countOfflineSavedSnacks(page: Page) {
  await page.evaluate((text) => {
    const w = window as unknown as { offlineSavedSnacks: number };
    w.offlineSavedSnacks = 0;
    let showing = false;
    new MutationObserver(() => {
      const now = [...document.querySelectorAll('.v-snackbar__content')].some((el) => el.textContent?.includes(text));
      if (now && !showing) {
        w.offlineSavedSnacks++;
      }
      showing = now;
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }, OFFLINE_SAVED);
}

function offlineSavedSnacks(page: Page): Promise<number> {
  return page.evaluate(() => (window as unknown as { offlineSavedSnacks: number }).offlineSavedSnacks);
}

let email: string;

test.beforeEach(async ({ page }) => {
  email = await signUp(page);
});

test('offline, marking a card learned is saved on the device and syncs when back online', async ({ page, context }) => {
  await createSet(page, 'Spanish verbs');
  await warmStudyPage(page, 'Spanish verbs');
  await context.setOffline(true);

  await openStudy(page, 'Spanish verbs');
  await page.getByRole('button', { name: 'Mark as learned' }).click();
  // Marking the only card learned ends the session and opens its summary.
  await expect(page.getByRole('dialog')).toContainText('Session complete');
  await expect(page.locator('.view__count')).toHaveText('1/1');
  await leaveFromLastCard(page);
  await expect(setCard(page, 'Spanish verbs')).toContainText('1 / 1');
  await expect(page.getByText(OFFLINE_SAVED)).toBeVisible();

  await context.setOffline(false);
  await expect.poll(async () => (await storedSets(page, email))[0]?.cards[0]?.learned).toBe(true);
  await page.reload();
  await expect(setCard(page, 'Spanish verbs')).toContainText('1 / 1');
});

test('offline, a new set is created and is there after reconnecting', async ({ page, context }) => {
  await goInApp(page, '/add');
  await expect(page.getByRole('button', { name: 'untitled set' })).toBeVisible();
  await context.setOffline(true);

  await page.getByRole('button', { name: 'untitled set' }).click();
  await page.getByPlaceholder('untitled set').fill('Offline set');
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Add card' }).click();
  await page.getByText('Example front side of a flashcard').click();
  await page.getByPlaceholder('Enter text for the front side').fill('uno');
  await page.getByRole('button', { name: 'Done' }).click();
  await page.getByRole('button', { name: 'Flip card' }).first().click();
  await page.getByText('Example back side of a flashcard').click();
  await page.getByPlaceholder('Enter text for the back side').fill('one');
  await page.getByRole('button', { name: 'Done' }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();

  await expect(page).toHaveURL(/\/home$/);
  await expect(setCard(page, 'Offline set')).toBeVisible();
  await expect(page.getByText(OFFLINE_SAVE)).toHaveCount(0);

  await context.setOffline(false);
  await expect.poll(async () => (await storedSets(page, email)).map((s) => s.title)).toEqual(['Offline set']);
  await page.reload();
  await expect(setCard(page, 'Offline set')).toBeVisible();
});

test('offline, the Edit button on a set card is enabled and opens the editor', async ({ page, context }) => {
  await createSet(page, 'Spanish verbs');
  await context.setOffline(true);

  const edit = setCard(page, 'Spanish verbs').getByRole('button', { name: 'Edit' });
  await expect(edit).not.toHaveClass(/v-chip--disabled/);
  await openEditor(page, 'Spanish verbs');
});

test('offline, swiping a set card right marks it favourite', async ({ page, context }) => {
  await createSet(page, 'Spanish verbs');
  await context.setOffline(true);

  await swipeRight(setCard(page, 'Spanish verbs'));
  await expect(setCard(page, 'Spanish verbs').locator(FAV_STAR)).toHaveCount(1);

  await context.setOffline(false);
  await expect.poll(async () => (await storedSets(page, email))[0]?.fav).toBe(true);
  await page.reload();
  await expect(setCard(page, 'Spanish verbs').locator(FAV_STAR)).toHaveCount(1);
});

test('offline, favouriting a set from its editor shows the star and keeps it after reconnecting', async ({ page, context }) => {
  await createSet(page, 'Spanish verbs');
  await context.setOffline(true);

  await openEditor(page, 'Spanish verbs');
  await openEditorOptions(page);
  await page.getByRole('button', { name: 'Mark favourite' }).click();
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(setCard(page, 'Spanish verbs').locator(FAV_STAR)).toHaveCount(1);

  await context.setOffline(false);
  await expect.poll(async () => (await storedSets(page, email))[0]?.fav).toBe(true);
  await page.reload();
  await expect(setCard(page, 'Spanish verbs').locator(FAV_STAR)).toHaveCount(1);
});

test('offline, moving a set to the bin from its editor takes it off Home and into the bin', async ({ page, context }) => {
  await createSet(page, 'Old notes');
  await context.setOffline(true);

  await openEditor(page, 'Old notes');
  await openEditorOptions(page);
  await page.getByRole('button', { name: 'Move to bin' }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(setCard(page, 'Old notes')).toHaveCount(0);

  await context.setOffline(false);
  await expect.poll(async () => (await storedSets(page, email))[0]?.trashed).toBe(true);
  await page.reload();
  await expect(setCard(page, 'Old notes')).toHaveCount(0);
  await page.goto('/bin');
  await expect(setCard(page, 'Old notes')).toBeVisible();
});

test('offline, delete forever is refused and the set stays in the bin', async ({ page, context }) => {
  await seedSet(page, email, 'Old notes', { trashed: true });
  await page.goto('/bin');
  await expect(setCard(page, 'Old notes')).toBeVisible();
  await context.setOffline(true);

  await setCard(page, 'Old notes').getByRole('button', { name: 'Delete' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Delete forever?');
  await dialog.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText(OFFLINE_DELETE)).toBeVisible();
  await expect(setCard(page, 'Old notes')).toBeVisible();

  await context.setOffline(false);
  await page.reload();
  await expect(setCard(page, 'Old notes')).toBeVisible();
  expect((await storedSets(page, email)).map((s) => s.title)).toEqual(['Old notes']);
});

test('offline, a label created on Profile is kept after reconnecting', async ({ page, context }) => {
  await page.goto('/profile');
  await expect(page.getByPlaceholder('Create new label')).toBeVisible();
  await context.setOffline(true);

  await page.getByPlaceholder('Create new label').fill('Verbs');
  await page.keyboard.press('Enter');
  await expect(page.locator('.v-chip', { hasText: 'Verbs' })).toBeVisible();

  // Firestore saves the queued write to IndexedDB a moment after the chip shows, so a reload at
  // once can lose it: wait for the label to reach the server first, as the other reconnect tests do.
  await context.setOffline(false);
  await expect.poll(() => storedLabels(page, email)).toEqual(['Verbs']);
  await page.reload();
  await expect(page.locator('.v-chip', { hasText: 'Verbs' })).toBeVisible();
});

test('offline, a profile change is refused and the name stays as it was', async ({ page, context }) => {
  await page.goto('/profile');
  await expect(page.getByRole('button', { name: 'Add your name' })).toBeVisible();
  await context.setOffline(true);

  await page.getByRole('button', { name: 'Add your name' }).click();
  await page.getByPlaceholder('Enter your name').fill('Ana');
  await page.keyboard.press('Enter');
  await expect(page.getByText(OFFLINE_SAVE)).toBeVisible();
  // The typed name stays in the field, to save once the device is back online.
  await expect(page.getByPlaceholder('Enter your name')).toHaveValue('Ana');

  await context.setOffline(false);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Add your name' })).toBeVisible();
  expect((await accountFor(page, email)).displayName).toBeUndefined();
});

test('offline, restore from backup is refused and adds no set', async ({ page, context }) => {
  await page.goto('/settings');
  await expect(page.getByRole('button', { name: 'Restore from backup' })).toBeVisible();
  await context.setOffline(true);

  await page.getByRole('button', { name: 'Restore from backup' }).click();
  await expect(page.getByText(OFFLINE_SAVE)).toBeVisible();

  // A file that reaches the input anyway (picked before the connection dropped) is refused too.
  const backup = {
    format: 'flashcards-backup',
    version: 1,
    exportedAt: '2026-01-01T00:00:00.000Z',
    labels: [],
    sets: [
      {
        title: 'Restored',
        color: '#E91E63',
        fav: false,
        labels: [],
        date: '2026-01-01T00:00:00.000Z',
        cards: [{ id: 'c1', front: 'uno', back: 'one', learned: false, date: '2026-01-01T00:00:00.000Z' }],
      },
    ],
  };
  await page.locator('.settings__file').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(page.getByText(OFFLINE_SAVE)).toBeVisible();

  await context.setOffline(false);
  await page.goto('/home');
  await expect(page.getByText('Welcome to your flashcards library!')).toBeVisible();
  await expect(page.locator('.set-card')).toHaveCount(0);
  expect(await storedSets(page, email)).toEqual([]);
});

test('offline, the saved-on-this-device snack shows once per offline period', async ({ page, context }) => {
  await seedSet(page, email, 'Verbs');
  await seedSet(page, email, 'Nouns');
  await page.goto('/home');
  await warmStudyPage(page, 'Verbs');
  await countOfflineSavedSnacks(page);
  await context.setOffline(true);

  await openStudy(page, 'Verbs');
  await page.getByRole('button', { name: 'Mark as learned' }).click();
  // Marking the only card learned ends the session and opens its summary.
  await expect(page.getByRole('dialog')).toContainText('Session complete');
  await leaveFromLastCard(page);
  await expect(setCard(page, 'Verbs')).toContainText('1 / 1');
  const snack = page.locator('.v-snackbar').filter({ hasText: OFFLINE_SAVED });
  await expect(snack).toBeVisible();
  await snack.getByRole('button', { name: 'Close' }).click();
  await expect(snack).toBeHidden();

  await openStudy(page, 'Nouns');
  await page.getByRole('button', { name: 'Mark as learned' }).click();
  // Marking the only card learned ends the session and opens its summary.
  await expect(page.getByRole('dialog')).toContainText('Session complete');
  await leaveFromLastCard(page);
  await expect(setCard(page, 'Nouns')).toContainText('1 / 1');
  await expect(snack).toBeHidden();
  expect(await offlineSavedSnacks(page)).toBe(1);
});
