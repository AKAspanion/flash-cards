import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { signUp } from './helpers';

const ROW_DESC = 'Add a daily study reminder to your calendar.';

test.beforeEach(async ({ page }) => {
  await signUp(page);
});

function timeField(page: Page) {
  return page.getByLabel('Daily reminder', { exact: true });
}

async function downloadIcs(page: Page, buttonName = 'Add to calendar'): Promise<{ name: string; text: string }> {
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: buttonName }).click();
  const download = await downloadPromise;
  return { name: download.suggestedFilename(), text: await readFile(await download.path(), 'utf8') };
}

test('the daily reminder row shows its description and the default time', async ({ page }) => {
  await page.goto('/settings');
  await expect(page.getByText(ROW_DESC)).toBeVisible();
  await expect(timeField(page)).toHaveValue('19:00');
});

test('adding to the calendar downloads a daily event at the chosen time', async ({ page }) => {
  await page.goto('/settings');
  await timeField(page).fill('07:30');
  const { name, text } = await downloadIcs(page);
  expect(name).toBe('flashcards-reminder.ics');
  expect(text).toContain('RRULE:FREQ=DAILY');
  expect(text).toContain('SUMMARY:Study flashcards');
  expect(text).toMatch(/DTSTART:\d{8}T073000\r\n/);
  const origin = new URL(page.url()).origin;
  expect(text).toContain(`URL:${origin}/\r\n`);
});

test('the chosen time is remembered after a reload', async ({ page }) => {
  await page.goto('/settings');
  await timeField(page).fill('07:30');
  await page.reload();
  await expect(timeField(page)).toHaveValue('07:30');
});

test('the file title is in the chosen language', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('button', { name: 'ही' }).click();
  const { text } = await downloadIcs(page, 'कैलेंडर में जोड़ें');
  expect(text).toContain('SUMMARY:फ़्लैशकार्ड पढ़ें');
});

for (const [label, size] of [
  ['390 px', { width: 390, height: 844 }],
  ['desktop', { width: 1280, height: 800 }],
] as const) {
  test(`settings with the reminder row is accessible at ${label}`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto('/settings');
    await expect(page.getByText(ROW_DESC)).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
  });
}
