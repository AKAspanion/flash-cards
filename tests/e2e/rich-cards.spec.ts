import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { setCard, signUp } from './helpers';
import { DEV_PORTS } from '../../dev-ports';

const AUTH = `http://127.0.0.1:${DEV_PORTS.auth}`;
const FIRESTORE = `http://127.0.0.1:${DEV_PORTS.firestore}`;
const PROJECT = 'demo-flash-cards';
const DOCS = `${FIRESTORE}/v1/projects/${PROJECT}/databases/(default)/documents`;
const OWNER = { Authorization: 'Bearer owner' };

const IMAGE = 'https://example.com/cat.png';
const SPANISH_ONLY = { front: 'es-ES' };

interface Spoken {
  text: string;
  lang: string;
}

type Win = Window & { __spoken: Spoken[]; __xss?: number };

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

/** Writes a set straight into the emulator (rules bypassed), so a test starts from known card text. */
async function seedSet(
  page: Page,
  email: string,
  title: string,
  cards: [string, string][],
  speech?: { front?: string; back?: string },
) {
  const uid = await uidFor(page, email);
  const body = cards.map(([front, back], i) => ({
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
        cards: { stringValue: JSON.stringify(body) },
        ...(speech
          ? {
              speech: {
                mapValue: {
                  fields: Object.fromEntries(Object.entries(speech).map(([side, tag]) => [side, { stringValue: tag }])),
                },
              },
            }
          : {}),
      },
    },
  });
  expect(response.ok()).toBe(true);
}

/** Replaces speech synthesis with a recorder: Chromium may have no voices. */
async function fakeSpeech(page: Page) {
  await page.addInitScript(() => {
    const win = window as unknown as Win;
    win.__spoken = [];
    class FakeUtterance {
      text: string;
      lang = '';
      constructor(text: string) {
        this.text = text;
      }
    }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: FakeUtterance, configurable: true });
    Object.defineProperty(window, 'speechSynthesis', {
      value: {
        speak: (u: FakeUtterance) => win.__spoken.push({ text: u.text, lang: u.lang }),
        cancel: () => undefined,
        getVoices: () => [],
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      },
      configurable: true,
    });
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

const spoken = (page: Page) => page.evaluate(() => (window as unknown as Win).__spoken);

async function openReview(page: Page, title: string) {
  await page.goto('/home');
  await setCard(page, title).getByText(/browse|review/).click();
  await expect(page.locator('.card-slider__item')).not.toHaveCount(0);
  await expect(page.locator('.flash-card').first()).toBeVisible();
}

async function openEditor(page: Page, title: string) {
  await page.goto('/home');
  await setCard(page, title).getByRole('button', { name: 'Edit' }).click();
  await expect(page).toHaveURL(/\/edit$/);
  await expect(page.locator('.flash-card').first()).toBeVisible();
}

/** The flip animation has to finish before a button on the new face is clicked. */
async function flipTo(page: Page, flipped: boolean) {
  await page.keyboard.press(' ');
  const inner = page.locator('.flash-card__inner').first();
  await expect(inner).toHaveClass(flipped ? /flash-card__inner--flipped/ : /^(?!.*flipped)/);
  await expect.poll(() => inner.evaluate((el) => el.getAnimations().length)).toBe(0);
}

async function routeImage(page: Page) {
  await page.route(IMAGE, (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="2000"><rect width="2000" height="2000" fill="red"/></svg>',
    }),
  );
}

async function expectNoA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const summary = results.violations.map(
    (v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => `${n.target.join(' ')} ${n.any[0]?.message ?? ''}`).join(' | ')}`,
  );
  expect(summary).toEqual([]);
}

let email: string;

test.beforeEach(async ({ page }) => {
  email = await signUp(page);
});

test.describe('rendering', () => {
  test('bold and italic show as strong and em with no markers', async ({ page }) => {
    await seedSet(page, email, 'Markdown', [['**Hola** _mundo_', 'hi']]);
    await openReview(page, 'Markdown');
    const text = page.locator('.flash-card__text');
    await expect(text.locator('strong')).toHaveText('Hola');
    await expect(text.locator('em')).toHaveText('mundo');
    await expect(text).not.toContainText('*');
    await expect(text).not.toContainText('_');
  });

  test('raw HTML is shown as text and never runs', async ({ page }) => {
    await seedSet(page, email, 'Hostile', [['<img src=x onerror="window.__xss=1">', 'b']]);
    await openReview(page, 'Hostile');
    await expect(page.locator('.flash-card__text')).toContainText('<img src=x onerror="window.__xss=1">');
    await expect(page.locator('.flash-card img')).toHaveCount(0);
    expect(await page.evaluate(() => (window as unknown as Win).__xss)).toBeUndefined();
  });

  test('a javascript: link does nothing when clicked', async ({ page }) => {
    await seedSet(page, email, 'Hostile', [['a', '[docs](javascript:window.__xss=1)']]);
    await openReview(page, 'Hostile');
    await flipTo(page, true);
    await page.getByText('docs').click();
    expect(await page.evaluate(() => (window as unknown as Win).__xss)).toBeUndefined();
  });

  test('a link in the editor opens a new page and not the text dialog', async ({ page }) => {
    await page.route('https://example.com/**', (route) => route.fulfill({ contentType: 'text/html', body: '<p>ok</p>' }));
    await seedSet(page, email, 'Links', [['[docs](https://example.com)', 'b']]);
    await openEditor(page, 'Links');
    const [popup] = await Promise.all([page.waitForEvent('popup'), page.getByRole('link', { name: 'docs' }).click()]);
    expect(popup.url()).toBe('https://example.com/');
    await expect(page.getByPlaceholder('Enter text for the front side')).toHaveCount(0);
  });

  test('the editor face renders bold too', async ({ page }) => {
    await seedSet(page, email, 'Bold', [['**Hola**', 'b']]);
    await openEditor(page, 'Bold');
    await expect(page.locator('.flash-card__text strong')).toHaveText('Hola');
  });

  test('two lines with no Markdown still show on two lines', async ({ page }) => {
    await seedSet(page, email, 'Lines', [['one\ntwo', 'b']]);
    await openReview(page, 'Lines');
    const text = page.locator('.flash-card__text');
    await expect(text.locator('br')).toHaveCount(1);
    const lineHeight = await text.evaluate((el) => parseFloat(getComputedStyle(el).lineHeight));
    expect((await text.boundingBox())!.height).toBeGreaterThanOrEqual(lineHeight * 2 - 1);
  });
});

test.describe('insert image', () => {
  async function openDialog(page: Page) {
    await seedSet(page, email, 'Images', [['abc', 'b']]);
    await openEditor(page, 'Images');
    await page.locator('.flash-card__text').click();
    await expect(page.getByPlaceholder('Enter text for the front side')).toBeVisible();
  }

  async function insertAt(page: Page, address: string) {
    const field = page.getByLabel('Image address');
    // A refused address leaves the image dialog open.
    if (!(await field.isVisible())) {
      await page.getByRole('button', { name: 'Insert image' }).click();
    }
    await field.fill(address);
    await page.getByRole('button', { name: 'Insert', exact: true }).click();
  }

  for (const size of [
    { width: 1280, height: 720 },
    { width: 390, height: 844 },
  ]) {
    test(`an https address inserts at the caret and the image stays within 40% of the face at ${size.width} px`, async ({ page }) => {
      await page.setViewportSize(size);
      await routeImage(page);
      await openDialog(page);
      const field = page.getByPlaceholder('Enter text for the front side');
      // Two steps back from the end leaves the caret after the first letter.
      await field.press('ArrowLeft');
      await field.press('ArrowLeft');
      await insertAt(page, IMAGE);
      await expect(field).toHaveValue(`a![](${IMAGE})bc`);
      await page.getByRole('button', { name: 'Done' }).click();

      const img = page.locator('.flash-card__face').first().locator('img');
      await expect(img).toBeVisible();
      await expect.poll(() => img.evaluate((el) => (el as HTMLImageElement).complete && el.clientHeight > 0)).toBe(true);
      const face = await page.locator('.flash-card__face').first().boundingBox();
      const box = await img.boundingBox();
      expect(box!.height).toBeLessThanOrEqual(face!.height * 0.4 + 1);
      expect(box!.width).toBeLessThanOrEqual(face!.width);
    });
  }

  test('an address that is not absolute https shows the error and changes nothing', async ({ page }) => {
    await openDialog(page);
    const field = page.getByPlaceholder('Enter text for the front side');
    for (const address of ['http://example.com/cat.png', '//example.com/cat.png', 'cat.png']) {
      await insertAt(page, address);
      await expect(page.getByText('Use an image address that starts with https://')).toBeVisible();
      await expect(field).toHaveValue('abc');
    }
  });

  test('the image dialog over the editor is accessible at 390 px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openDialog(page);
    await page.getByRole('button', { name: 'Insert image' }).click();
    await expect(page.getByLabel('Image address')).toBeVisible();
    await expectNoA11yViolations(page);
  });
});

test.describe('read aloud', () => {
  test('the button speaks the plain text of the side in its language', async ({ page }) => {
    await fakeSpeech(page);
    await seedSet(page, email, 'Speech', [['**Hola** _mundo_', 'back']], SPANISH_ONLY);
    await openReview(page, 'Speech');
    await page.getByRole('button', { name: 'Read aloud' }).first().click();
    await expect.poll(() => spoken(page)).toEqual([{ text: 'Hola mundo', lang: 'es-ES' }]);
  });

  test('r speaks the back once flipped, with no language when the side has none', async ({ page }) => {
    await fakeSpeech(page);
    await seedSet(page, email, 'Speech', [['front', 'the **back**']], SPANISH_ONLY);
    await openReview(page, 'Speech');
    await flipTo(page, true);
    await page.keyboard.press('r');
    await expect.poll(() => spoken(page)).toEqual([{ text: 'the back', lang: '' }]);
  });

  test('with Back first on, r speaks the back of a fresh card', async ({ page }) => {
    await fakeSpeech(page);
    await seedSet(page, email, 'Speech', [['front', 'back']], { back: 'en-US' });
    await page.goto('/home');
    await page.evaluate(() => localStorage.setItem('study-reverse', 'true'));
    await openReview(page, 'Speech');
    await page.keyboard.press('R');
    await expect.poll(() => spoken(page)).toEqual([{ text: 'back', lang: 'en-US' }]);
  });

  test('r speaks nothing while a text field has focus or Ctrl is held', async ({ page }) => {
    await fakeSpeech(page);
    await seedSet(page, email, 'Speech', [['front', 'back']]);
    await openReview(page, 'Speech');
    await page.evaluate(() => {
      const input = document.createElement('input');
      input.id = 'probe';
      document.body.append(input);
      input.focus();
    });
    await page.keyboard.press('r');
    await page.locator('#probe').blur();
    await page.keyboard.press('Control+r');
    // The key handler ran by now: a later accepted press is spoken, the earlier ones were not.
    await page.keyboard.press('r');
    await expect.poll(() => spoken(page)).toEqual([{ text: 'front', lang: '' }]);
  });

  test('without speech synthesis there is no button and r does nothing', async ({ page }) => {
    await removeSpeechSynthesis(page);
    await seedSet(page, email, 'Speech', [['front', 'back']]);
    await openReview(page, 'Speech');
    await expect(page.getByRole('button', { name: 'Read aloud' })).toHaveCount(0);
    await page.keyboard.press('r');
    await expect(page.locator('.flash-card__text')).toHaveText('front');
  });

  test('the editor has no Read aloud button', async ({ page }) => {
    await fakeSpeech(page);
    await seedSet(page, email, 'Speech', [['front', 'back']]);
    await openEditor(page, 'Speech');
    await expect(page.getByRole('button', { name: 'Read aloud' })).toHaveCount(0);
  });

  test('r reads the card on /due in the set language', async ({ page }) => {
    await fakeSpeech(page);
    await seedSet(page, email, 'Speech', [['**uno**', 'one']], SPANISH_ONLY);
    await page.goto('/due');
    await expect(page.locator('.flash-card')).toBeVisible();
    await page.keyboard.press('r');
    await expect.poll(() => spoken(page)).toEqual([{ text: 'uno', lang: 'es-ES' }]);
  });

  test('the shortcuts list has an R row', async ({ page }) => {
    await seedSet(page, email, 'Speech', [['front', 'back']]);
    await openReview(page, 'Speech');
    await page.keyboard.press('?');
    await expect(page.getByRole('dialog').locator('.shortcut-list__keys', { hasText: 'R' })).toBeVisible();
    await expect(page.getByRole('dialog').getByText('Read aloud')).toBeVisible();
  });

  test('the review screen is accessible at 390 px', async ({ page }) => {
    await fakeSpeech(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await seedSet(page, email, 'Speech', [['**front**', 'back']]);
    await openReview(page, 'Speech');
    await expectNoA11yViolations(page);
  });
});
