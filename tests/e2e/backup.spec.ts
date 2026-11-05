import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { setCard, signUp } from './helpers';

const AUTH = 'http://127.0.0.1:9099';
const FIRESTORE = 'http://127.0.0.1:8085';
const PROJECT = 'demo-flash-cards';
const DOCS = `${FIRESTORE}/v1/projects/${PROJECT}/databases/(default)/documents`;
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

/** Writes a label straight into the emulator and returns its document id. */
async function seedLabel(page: Page, email: string, label: string): Promise<string> {
  const uid = await uidFor(page, email);
  const response = await page.request.post(`${DOCS}/labels`, {
    headers: OWNER,
    data: { fields: { label: { stringValue: label }, uid: { stringValue: uid } } },
  });
  expect(response.ok()).toBe(true);
  const { name } = (await response.json()) as { name: string };
  return name.split('/').pop() as string;
}

/** Writes a set straight into the emulator (rules bypassed). */
async function seedSet(
  page: Page,
  email: string,
  title: string,
  options: { labels?: string[]; trashed?: boolean; cards?: [string, string, boolean][] } = {},
) {
  const uid = await uidFor(page, email);
  const cards = (options.cards ?? [['hablar', 'to speak', true], ['comer', 'to eat', false]]).map(([front, back, learned], i) => ({
    id: `card-${i + 1}`,
    front,
    back,
    learned,
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
        trashed: { booleanValue: options.trashed ?? false },
        fav: { booleanValue: false },
        labels: { arrayValue: { values: (options.labels ?? []).map((l) => ({ stringValue: l })) } },
        cards: { stringValue: JSON.stringify(cards) },
      },
    },
  });
  expect(response.ok()).toBe(true);
}

function today(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

interface BackupFile {
  format: string;
  labels: { docId: string; label: string }[];
  sets: { title: string; labels: string[]; cards: { front: string; back: string; learned: boolean }[] }[];
}

/** Presses "Back up all sets" and returns the downloaded file's name and parsed content. */
async function downloadBackup(page: Page): Promise<{ name: string; backup: BackupFile; path: string }> {
  await page.goto('/settings');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Back up all sets' }).click();
  const download = await downloadPromise;
  const path = await download.path();
  return { name: download.suggestedFilename(), backup: JSON.parse(await readFile(path, 'utf8')) as BackupFile, path };
}

async function restoreFile(page: Page, file: string | { name: string; mimeType: string; buffer: Buffer }) {
  await page.goto('/settings');
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Restore from backup' }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles(file);
}

function backupBuffer(content: unknown, name = 'backup.json') {
  return { name, mimeType: 'application/json', buffer: Buffer.from(typeof content === 'string' ? content : JSON.stringify(content)) };
}

function backupSet(title: string, over: Record<string, unknown> = {}) {
  return {
    title,
    color: '#E91E63',
    fav: false,
    labels: [],
    date: '2026-01-01T00:00:00.000Z',
    cards: [{ id: 'c1', front: 'uno', back: 'one', learned: false, date: '2026-01-01T00:00:00.000Z' }],
    ...over,
  };
}

function backupOf(sets: unknown[], labels: { docId: string; label: string }[] = []) {
  return { format: 'flashcards-backup', version: 1, exportedAt: '2026-01-01T00:00:00.000Z', labels, sets };
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

let email: string;

test.beforeEach(async ({ page }) => {
  email = await signUp(page);
});

test('the backup and restore rows describe themselves', async ({ page }) => {
  await page.goto('/settings');
  await expect(page.getByText('Download every set and label as one file.')).toBeVisible();
  await expect(page.getByText('Add the sets from a backup file. Nothing you have is overwritten.')).toBeVisible();
});

test('Back up all sets downloads every set outside the bin and every label', async ({ page }) => {
  const labelId = await seedLabel(page, email, 'Languages');
  await seedSet(page, email, 'Spanish', { labels: [labelId] });
  await seedSet(page, email, 'French');
  await seedSet(page, email, 'Binned', { trashed: true });

  const { name, backup } = await downloadBackup(page);
  expect(name).toBe(`flashcards-backup-${today()}.json`);
  expect(backup.format).toBe('flashcards-backup');
  expect(backup.sets.map((s) => s.title).sort()).toEqual(['French', 'Spanish']);
  expect(backup.labels.map((l) => l.label)).toEqual(['Languages']);
  expect(backup.sets.find((s) => s.title === 'Spanish')?.cards).toHaveLength(2);
});

test('a backup restores into a new account with cards, progress and labels', async ({ page, browser }) => {
  const labelId = await seedLabel(page, email, 'Languages');
  await seedSet(page, email, 'Spanish', { labels: [labelId] });
  await seedSet(page, email, 'French');
  const { path } = await downloadBackup(page);

  const context = await browser.newContext();
  const other = await context.newPage();
  await signUp(other);
  await restoreFile(other, path);
  await expect(other.getByText('Restored 2 sets.')).toBeVisible();

  await other.goto('/home');
  await expect(setCard(other, 'Spanish')).toBeVisible();
  await expect(setCard(other, 'French')).toBeVisible();
  await expect(setCard(other, 'Spanish')).toContainText('1 / 2');
  await expect(setCard(other, 'Spanish').getByText('Languages')).toBeVisible();
  await context.close();
});

test('restoring into the account it came from adds each set again and changes none', async ({ page }) => {
  await seedSet(page, email, 'Spanish');
  await seedSet(page, email, 'French');
  const { path } = await downloadBackup(page);

  await restoreFile(page, path);
  await expect(page.getByText('Restored 2 sets.')).toBeVisible();

  await page.goto('/home');
  await expect(setCard(page, 'Spanish')).toHaveCount(2);
  await expect(setCard(page, 'French')).toHaveCount(2);
});

test('a label that already exists is reused, not created twice', async ({ page }) => {
  const labelId = await seedLabel(page, email, 'Languages');
  await restoreFile(page, backupBuffer(backupOf([backupSet('Spanish', { labels: ['old-id'] })], [{ docId: 'old-id', label: 'Languages' }])));
  await expect(page.getByText('Restored 1 set.')).toBeVisible();

  const { backup } = await downloadBackup(page);
  expect(backup.labels.map((l) => l.label)).toEqual(['Languages']);
  expect(backup.sets).toHaveLength(1);
  expect(backup.sets[0].labels).toEqual([labelId]);
});

test('a file that is not a backup creates nothing', async ({ page }) => {
  const setExport = { format: 'flashcards-set', version: 1, title: 'Spanish', color: '#E91E63', cards: [] };
  await restoreFile(page, backupBuffer(setExport, 'set.json'));
  await expect(page.getByText("That file isn't a flashcards backup.")).toBeVisible();

  await restoreFile(page, { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('just some words') });
  await expect(page.getByText("That file isn't a flashcards backup.")).toBeVisible();

  await page.goto('/home');
  await expect(page.locator('.set-card')).toHaveCount(0);
});

test('a set that fails to save does not stop the others and is not counted', async ({ page }) => {
  const huge = backupSet('Huge', {
    cards: [{ id: 'c1', front: 'x'.repeat(950_000), back: 'y', learned: false, date: '2026-01-01T00:00:00.000Z' }],
  });
  await restoreFile(page, backupBuffer(backupOf([huge, backupSet('Spanish')])));
  await expect(page.getByText('Restored 1 set.')).toBeVisible();

  await page.goto('/home');
  await expect(setCard(page, 'Spanish')).toBeVisible();
  await expect(setCard(page, 'Huge')).toHaveCount(0);
});

test('offline, restore shows the offline message and backup still downloads', async ({ page, context }) => {
  await seedSet(page, email, 'Spanish');
  await page.goto('/settings');
  await expect(page.getByRole('button', { name: 'Back up all sets' })).toBeVisible();
  await context.setOffline(true);

  await page.getByRole('button', { name: 'Restore from backup' }).click();
  await expect(page.getByText("You're offline. Connect to the internet to save.")).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Back up all sets' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(`flashcards-backup-${today()}.json`);

  await context.setOffline(false);
  await page.goto('/home');
  await expect(page.locator('.set-card')).toHaveCount(1);
});

test('the Settings page has no axe violations at 390 px wide', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/settings');
  await expect(page.getByRole('button', { name: 'Back up all sets' })).toBeVisible();
  await expectNoA11yViolations(page);
});
