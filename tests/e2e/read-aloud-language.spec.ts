import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { DEV_PORTS } from '../../dev-ports';
import { createSet, setCard, signUp } from './helpers';

const AUTH = `http://127.0.0.1:${DEV_PORTS.auth}`;
const FIRESTORE = `http://127.0.0.1:${DEV_PORTS.firestore}`;
const DOCS = `${FIRESTORE}/v1/projects/demo-flash-cards/databases/(default)/documents`;
const PROJECT = 'demo-flash-cards';
// The emulator owner token bypasses the security rules.
const OWNER = { Authorization: 'Bearer owner' };

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

/** Headless Chromium may have no voices, so the page gets two fake ones. */
async function stubVoices(page: Page) {
  await page.addInitScript(() => {
    const voices = [{ lang: 'es-ES' }, { lang: 'en-US' }, { lang: 'es-ES' }];
    Object.defineProperty(window.speechSynthesis, 'getVoices', { value: () => voices, configurable: true });
  });
}

async function removeSpeechSynthesis(page: Page) {
  await page.addInitScript(() => {
    for (const name of ['speechSynthesis', 'SpeechSynthesisUtterance']) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (window as any)[name];
      } catch {
        /* an own property that can't be deleted falls through to the prototype below */
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (Object.getPrototypeOf(window) as any)[name];
    }
  });
}

async function openEditor(page: Page, title: string) {
  await setCard(page, title).getByRole('button', { name: 'Edit' }).click();
  await expect(page).toHaveURL(/\/edit$/);
}

async function openOptions(page: Page) {
  await page.getByRole('button', { name: 'Options' }).first().click();
}

function sideSelect(page: Page, side: 'Front' | 'Back') {
  return page.locator('.v-select').filter({ has: page.getByRole('combobox', { name: side }) });
}

async function pick(page: Page, side: 'Front' | 'Back', option: string) {
  await sideSelect(page, side).locator('.v-field').click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

async function expectSide(page: Page, side: 'Front' | 'Back', text: string) {
  await expect(sideSelect(page, side).locator('.v-select__selection-text')).toHaveText(text);
}

/** The open panel covers the Save button, so it is closed first. */
async function closeOptions(page: Page) {
  const handle = page.locator('.option-panel__handle');
  await handle.click();
  await expect(handle).toHaveAttribute('aria-expanded', 'false');
  // It slides down; wait for it to stop before anything behind it is clicked.
  await expect(page.locator('.option-panel')).toHaveCSS('transform', /^matrix\(1, 0, 0, 1, 0, [1-9]/);
  await expect.poll(() => page.locator('.option-panel').evaluate((el) => el.getAnimations().length)).toBe(0);
  await expect(page.locator('.v-overlay--active')).toHaveCount(0);
}

async function save(page: Page) {
  await closeOptions(page);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page).toHaveURL(/\/home$/);
}

/** The Spanish name the page's own Intl gives; ICU decides the wording. */
async function spanishName(page: Page) {
  return page.evaluate(() => new Intl.DisplayNames('en', { type: 'language' }).of('es-ES') as string);
}

test('a side set to Spanish is kept after a reload, the other stays on Browser default', async ({ page }) => {
  await stubVoices(page);
  await signUp(page);
  await createSet(page, 'Spanish verbs');
  await openEditor(page, 'Spanish verbs');
  await openOptions(page);
  await expect(page.getByText('Read-aloud language')).toBeVisible();
  const spanish = await spanishName(page);
  await pick(page, 'Front', spanish);
  await save(page);

  await openEditor(page, 'Spanish verbs');
  await openOptions(page);
  await expectSide(page, 'Front', spanish);
  await expectSide(page, 'Back', 'Browser default');
});

test('setting Front back to Browser default is kept after a reload', async ({ page }) => {
  await stubVoices(page);
  await signUp(page);
  await createSet(page, 'Spanish verbs');
  await openEditor(page, 'Spanish verbs');
  await openOptions(page);
  const spanish = await spanishName(page);
  await pick(page, 'Front', spanish);
  await save(page);

  await openEditor(page, 'Spanish verbs');
  await openOptions(page);
  await expectSide(page, 'Front', spanish);
  await pick(page, 'Front', 'Browser default');
  await save(page);

  await openEditor(page, 'Spanish verbs');
  await openOptions(page);
  await expectSide(page, 'Front', 'Browser default');
  await expectSide(page, 'Back', 'Browser default');
});

test('the row is hidden when the browser has no speech synthesis', async ({ page }) => {
  await removeSpeechSynthesis(page);
  await signUp(page);
  await page.goto('/add');
  await openOptions(page);
  await expect(page.getByRole('button', { name: 'Import cards' })).toBeVisible();
  await expect(page.getByText('Read-aloud language')).toHaveCount(0);
});

test('a failed save shows the save error and keeps the choice in the editor', async ({ page }) => {
  await stubVoices(page);
  const email = await signUp(page);
  await createSet(page, 'Spanish verbs');
  await openEditor(page, 'Spanish verbs');
  // With the stored set gone, the update is refused by the emulator.
  const uid = await uidFor(page, email);
  // Only this user's sets (a query, so paging can't hide them): the tests share one emulator and run side by side.
  const queried = await page.request.post(`${DOCS}:runQuery`, {
    headers: OWNER,
    data: {
      structuredQuery: {
        from: [{ collectionId: 'flash-card-sets' }],
        where: { fieldFilter: { field: { fieldPath: 'uid' }, op: 'EQUAL', value: { stringValue: uid } } },
      },
    },
  });
  const documents = ((await queried.json()) as { document?: { name: string } }[]).flatMap((row) => (row.document ? [row.document] : []));
  expect(documents.length).toBeGreaterThan(0);
  for (const doc of documents) {
    await page.request.delete(`${FIRESTORE}/v1/${doc.name}`, { headers: OWNER });
  }

  await openOptions(page);
  const spanish = await spanishName(page);
  await pick(page, 'Front', spanish);
  await closeOptions(page);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  // session.showError shows the app's own message; Firebase's text goes only to the console.
  const snack = page.locator('.v-snackbar');
  await expect(snack).toContainText('Could not save. Please try again.');
  await expect(snack).not.toContainText('PERMISSION_DENIED');
  await expect(page).toHaveURL(/\/edit$/);
  await expectSide(page, 'Front', spanish);
});

test('the options panel is accessible at 390 px', async ({ page }) => {
  await stubVoices(page);
  await signUp(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/add');
  await openOptions(page);
  await expect(page.getByText('Read-aloud language')).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
});
