import { expect, type Page } from '@playwright/test';
import { signedInUid } from './stats-helpers';
import { DEV_PORTS } from '../../dev-ports';

const FIRESTORE = `http://127.0.0.1:${DEV_PORTS.firestore}`;
const PROJECT = 'demo-flash-cards';
const DOCS = `${FIRESTORE}/v1/projects/${PROJECT}/databases/(default)/documents`;
// The emulator owner token bypasses the security rules.
const OWNER = { Authorization: 'Bearer owner' };

const equals = (fieldPath: string, value: string) => ({
  fieldFilter: { field: { fieldPath }, op: 'EQUAL', value: { stringValue: value } },
});

/**
 * Pads the last card of the signed-in account's set `title` past the app's 900,000-byte save limit,
 * so every later save of that set is refused. Going offline no longer fails a save (it lands on the
 * device), so this is how a test forces one. The padding sits in an extra key the app keeps
 * untouched, so the deck keeps its cards and each still renders cheaply.
 */
export async function makeSetTooBigToSave(page: Page, title: string): Promise<void> {
  const uid = await signedInUid(page);
  // A query, not a listing: a listing is paged, and a full run leaves hundreds of sets behind.
  const queried = await page.request.post(`${DOCS}:runQuery`, {
    headers: OWNER,
    data: {
      structuredQuery: {
        from: [{ collectionId: 'flash-card-sets' }],
        where: { compositeFilter: { op: 'AND', filters: [equals('uid', uid), equals('title', title)] } },
      },
    },
  });
  expect(queried.ok()).toBe(true);
  const rows = (await queried.json()) as { document?: { name: string; fields: { cards: { stringValue: string } } } }[];
  const docs = rows.flatMap((r) => (r.document ? [r.document] : []));
  expect(docs).toHaveLength(1);
  const cards = JSON.parse(docs[0].fields.cards.stringValue) as Record<string, unknown>[];
  expect(cards.length).toBeGreaterThan(0);
  cards[cards.length - 1] = { ...cards[cards.length - 1], pad: 'x'.repeat(910_000) };
  const response = await page.request.patch(`${FIRESTORE}/v1/${docs[0].name}?updateMask.fieldPaths=cards`, {
    headers: OWNER,
    data: { fields: { cards: { stringValue: JSON.stringify(cards) } } },
  });
  expect(response.ok()).toBe(true);
}
