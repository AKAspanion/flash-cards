import { expect, test, type Page } from '@playwright/test';
import { createSet, setCard, signUp } from './helpers';

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'touch swipe is a mobile gesture');
  await signUp(page);
  await createSet(page, 'Swipe set');
});

/** Touches the set's header, drags it `dx` px sideways and holds (the finger stays down). */
async function holdSwipe(page: Page, dx: number) {
  const box = await page.locator('.set-card__swipe').boundingBox();
  if (!box) {
    throw new Error('swipe header not rendered');
  }
  const x = box.x + box.width / 2;
  const y = box.y + 8;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let i = 1; i <= 5; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + (dx * i) / 5, y }] });
  }
  // Wait for the header to reach the full swipe distance.
  await expect
    .poll(async () => Math.round(((await page.locator('.set-card__swipe').boundingBox())?.x ?? 0) - 32))
    .toBe(Math.round(dx));
  return { cdp };
}

/** Is the element at (x, y) inside the swipe header? */
function insideHeader(page: Page, x: number, y: number) {
  return page.evaluate(
    ([px, py]) => !!document.elementFromPoint(px, py)?.closest('.set-card__swipe'),
    [x, y],
  );
}

test('swiped left, the header stays visible past the card edge', async ({ page }) => {
  const card = (await setCard(page, 'Swipe set').boundingBox())!;
  const header = (await page.locator('.set-card__swipe').boundingBox())!;
  const { cdp } = await holdSwipe(page, -100);
  expect(await insideHeader(page, card.x - 10, header.y + header.height / 2)).toBe(true);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
});

test('swiped right, the header stays visible past the card edge', async ({ page }) => {
  const card = (await setCard(page, 'Swipe set').boundingBox())!;
  const header = (await page.locator('.set-card__swipe').boundingBox())!;
  const { cdp } = await holdSwipe(page, 100);
  expect(await insideHeader(page, card.x + card.width + 10, header.y + header.height / 2)).toBe(true);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
});

test('the page gains no horizontal scroll while swiping', async ({ page }) => {
  for (const dx of [-100, 100]) {
    const { cdp } = await holdSwipe(page, dx);
    const widths = await page.evaluate(() => ({
      scroll: document.scrollingElement!.scrollWidth,
      client: document.scrollingElement!.clientWidth,
    }));
    expect(widths.scroll).toBe(widths.client);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    await expect
      .poll(async () => Math.round((await page.locator('.set-card__swipe').boundingBox())!.x))
      .toBe(32);
  }
});

test('a swipe that stops short of the trigger returns the header to the card', async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  const header = (await page.locator('.set-card__swipe').boundingBox())!;
  const x = header.x + header.width / 2;
  const y = header.y + 8;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 40, y }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect
    .poll(async () => (await page.locator('.set-card__swipe').boundingBox())!.x)
    .toBe((await setCard(page, 'Swipe set').boundingBox())!.x);
  await expect(setCard(page, 'Swipe set')).toBeVisible();
});

test('in a two-column grid, a header swiped right paints above the next card in the row', async ({ page }) => {
  await createSet(page, 'Second set');
  await page.setViewportSize({ width: 1024, height: 900 });
  const cards = page.locator('.set-card');
  await expect(cards).toHaveCount(2);
  const boxes = await cards.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON()));
  const [left, right] = boxes[0].x < boxes[1].x ? boxes : [boxes[1], boxes[0]];
  expect(left.y).toBe(right.y);
  const x = left.x + left.width / 2;
  const y = left.y + 8;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let i = 1; i <= 5; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 20 * i, y }] });
  }
  const leftIndex = boxes[0].x < boxes[1].x ? 0 : 1;
  const swiped = cards.nth(leftIndex).locator('.set-card__swipe');
  await expect.poll(async () => Math.round((await swiped.boundingBox())!.x - left.x)).toBe(100);
  // A point inside the swiped header that lies over the right-hand neighbour.
  const probeX = right.x + 20;
  const probeY = left.y + 50;
  expect(
    await page.evaluate(
      ([px, py, idx]) => !!document.elementFromPoint(px, py)?.closest('.set-card__swipe') &&
        document.querySelectorAll('.set-card')[idx].contains(document.elementFromPoint(px, py)),
      [probeX, probeY, leftIndex],
    ),
  ).toBe(true);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
});
