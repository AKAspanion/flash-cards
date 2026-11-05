import { expect, type Page } from '@playwright/test';
import { DEV_PORTS } from '../../dev-ports';

const FIRESTORE = `http://127.0.0.1:${DEV_PORTS.firestore}`;
const PROJECT = 'demo-flash-cards';
const DOCS = `${FIRESTORE}/v1/projects/${PROJECT}/databases/(default)/documents`;
// The emulator owner token bypasses the security rules.
const OWNER = { Authorization: 'Bearer owner' };

type FirestoreValue = Record<string, unknown>;

/** The uid of the account signed in on `page`, read from the Auth SDK's own IndexedDB record. */
export async function signedInUid(page: Page): Promise<string> {
  const uid = await page.evaluate(
    () =>
      new Promise<string | null>((resolve, reject) => {
        const open = indexedDB.open('firebaseLocalStorageDb');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const request = db.transaction('firebaseLocalStorage').objectStore('firebaseLocalStorage').getAll();
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            const rows = request.result as { value?: { uid?: string } }[];
            resolve(rows.find((r) => r.value?.uid)?.value?.uid ?? null);
          };
        };
      }),
  );
  if (!uid) {
    throw new Error('No signed-in account on the page');
  }
  return uid;
}

function toValue(value: unknown): FirestoreValue {
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return { integerValue: String(value) };
  if (value && typeof value === 'object') {
    return { mapValue: { fields: toFields(value as Record<string, unknown>) } };
  }
  throw new Error(`Unsupported value ${String(value)}`);
}

function toFields(data: Record<string, unknown>): Record<string, FirestoreValue> {
  return Object.fromEntries(Object.entries(data).map(([k, v]) => [k, toValue(v)]));
}

function fromValue(value: FirestoreValue): unknown {
  if ('integerValue' in value) return Number(value.integerValue);
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('mapValue' in value) {
    return fromFields(((value.mapValue as { fields?: Record<string, FirestoreValue> }).fields) ?? {});
  }
  return undefined;
}

function fromFields(fields: Record<string, FirestoreValue>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, fromValue(v)]));
}

/** The signed-in account's `user-stats` document, or null when none exists. */
export async function readUserStats(page: Page): Promise<{ goal?: number; days: Record<string, number> } | null> {
  const uid = await signedInUid(page);
  const response = await page.request.get(`${DOCS}/user-stats/${uid}`, { headers: OWNER });
  if (response.status() === 404) {
    return null;
  }
  expect(response.ok()).toBe(true);
  const { fields } = (await response.json()) as { fields?: Record<string, FirestoreValue> };
  const data = fromFields(fields ?? {});
  return { goal: data.goal as number | undefined, days: (data.days as Record<string, number> | undefined) ?? {} };
}

/** Overwrites `user-stats/<signed-in uid>` with `data`. */
export async function seedUserStats(page: Page, data: Record<string, unknown>): Promise<void> {
  const uid = await signedInUid(page);
  const response = await page.request.patch(`${DOCS}/user-stats/${uid}`, {
    headers: OWNER,
    data: { fields: toFields(data) },
  });
  expect(response.ok()).toBe(true);
}
