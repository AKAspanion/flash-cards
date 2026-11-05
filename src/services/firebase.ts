import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reauthenticateWithRedirect,
  signInWithEmailAndPassword,
  signInWithRedirect,
  signOut as firebaseSignOut,
  updateProfile,
  type Auth,
  type User,
} from 'firebase/auth';
import {
  clearIndexedDbPersistence,
  collection,
  connectFirestoreEmulator,
  deleteField,
  doc,
  getDoc,
  getDocs,
  increment,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
  query,
  setDoc,
  updateDoc,
  terminate,
  waitForPendingWrites,
  where,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import type { CardSet, Label, SharedSet, UserStats } from '@/types';
import { authDomainFor } from './authDomain';
import { emulatorHostFor } from './emulatorHost';
import { chooseLocalCache } from './localCache';
import { OWNED_COLLECTIONS } from './ownedCollections';
import { cardSetFromDoc, cardSetToDoc, isShareId, labelFromDoc, sharedSetFromDoc, toSharedDoc } from './cardSetMapper';
import { statsFromDoc } from './statsMapper';
import { DEV_PORTS } from '../../dev-ports';

const SETS = 'flash-card-sets';
const LABELS = 'labels';
const STATS = 'user-stats';
const SHARED = 'shared-sets';

const env = import.meta.env;
const useEmulators = env.VUE_APP_USE_EMULATORS === 'true';

const config = {
  apiKey: env.VUE_APP_API_KEY,
  authDomain: authDomainFor(
    typeof window === 'undefined' ? undefined : window.location.host,
    useEmulators,
    env.VUE_APP_AUTH_DOMAIN ?? '',
  ),
  databaseURL: env.VUE_APP_DATABASE_URL,
  projectId: env.VUE_APP_PROJECT_ID,
  storageBucket: env.VUE_APP_STORAGE_BUCKET,
  messagingSenderId: env.VUE_APP_MESSAGING_SENDER_ID,
  appId: env.VUE_APP_APP_ID,
  measurementId: env.VUE_APP_MEASUREMENT_ID,
};

let services: { app: FirebaseApp; auth: Auth; db: Firestore } | null = null;

export class FirebaseConfigError extends Error {}

function getServices() {
  if (services) {
    return services;
  }
  const required = useEmulators ? (['apiKey', 'projectId'] as const) : (['apiKey', 'authDomain', 'projectId', 'appId'] as const);
  const missing = required.filter((key) => !config[key]);
  if (missing.length) {
    throw new FirebaseConfigError(
      `Firebase is not configured (missing ${missing.join(', ')}). ` +
        'Copy .env.example to .env.local and fill in your Firebase web app config.',
    );
  }
  const app = initializeApp(config);
  const auth = getAuth(app);
  // Persistent (IndexedDB, shared across tabs) so sets can be studied and saved offline (spec 10.1).
  const localCache =
    chooseLocalCache(globalThis) === 'persistent'
      ? persistentLocalCache({ tabManager: persistentMultipleTabManager() })
      : memoryLocalCache();
  const db = initializeFirestore(app, { localCache });
  if (useEmulators) {
    const host = emulatorHostFor(typeof window === 'undefined' ? undefined : window.location.hostname);
    connectAuthEmulator(auth, `http://${host}:${DEV_PORTS.auth}`, { disableWarnings: true });
    connectFirestoreEmulator(db, host, DEV_PORTS.firestore);
  }
  services = { app, auth, db };
  return services;
}

function requireUid(): string {
  const user = getServices().auth.currentUser;
  if (!user) {
    throw new Error('You are signed out. Please log in again.');
  }
  return user.uid;
}

// ---- Auth ----

/** Resolves with the restored user (or null) once Firebase has read the saved session. */
export async function getAuthUser(): Promise<User | null> {
  const { auth } = getServices();
  await auth.authStateReady();
  return auth.currentUser;
}

/** Fires on every sign-in/sign-out, including ones made in another tab. */
export function onUserChanged(callback: (user: User | null) => void) {
  return onAuthStateChanged(getServices().auth, callback);
}

export function signInWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(getServices().auth, email.trim(), password);
}

export function signUpWithEmail(email: string, password: string) {
  return createUserWithEmailAndPassword(getServices().auth, email.trim(), password);
}

/** What a Google redirect came back with: the user it signed in, or the error it failed with. */
export type RedirectOutcome =
  | { operationType: 'signIn' | 'reauthenticate' | 'link'; uid: string }
  | { error: unknown };

// A redirect rather than a popup: the auth domain is the host serving the app (authDomainFor),
// so Google's handler is same-origin and works where third-party storage is partitioned.
export async function signInWithGoogle(): Promise<void> {
  await signInWithRedirect(getServices().auth, new GoogleAuthProvider());
}

/** Reads the result of a Google redirect once, after the page comes back; null when there was none. */
export async function getRedirectOutcome(): Promise<RedirectOutcome | null> {
  try {
    const result = await getRedirectResult(getServices().auth);
    if (!result) {
      return null;
    }
    const operationType = result.operationType;
    if (operationType !== 'signIn' && operationType !== 'reauthenticate' && operationType !== 'link') {
      return null;
    }
    return { operationType, uid: result.user.uid };
  } catch (error) {
    return { error };
  }
}

/** Which reconfirmation the signed-in user gets before deleting their account. */
export function confirmMethod(): 'password' | 'google' {
  const user = getServices().auth.currentUser;
  return user?.providerData.some((p) => p.providerId === 'password') ? 'password' : 'google';
}

export async function reauthenticateWithPassword(password: string): Promise<void> {
  const user = getServices().auth.currentUser;
  if (!user?.email) {
    throw new Error('You are signed out. Please log in again.');
  }
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
}

/** Starts a redirect to Google; the page leaves and comes back with a `reauthenticate` outcome. */
export async function reauthenticateWithGoogle(): Promise<void> {
  const user = getServices().auth.currentUser;
  if (!user) {
    throw new Error('You are signed out. Please log in again.');
  }
  await reauthenticateWithRedirect(user, new GoogleAuthProvider());
}

const BATCH_LIMIT = 500;

/** Deletes everything the user owns, then the user. A retry after a failure deletes what is left. */
export async function deleteAccount(): Promise<void> {
  const { auth, db } = getServices();
  const user = auth.currentUser;
  if (!user) {
    throw new Error('You are signed out. Please log in again.');
  }
  for (const { name, ownerField } of OWNED_COLLECTIONS) {
    const snapshot = await getDocs(query(collection(db, name), where(ownerField, '==', user.uid)));
    for (let i = 0; i < snapshot.docs.length; i += BATCH_LIMIT) {
      const batch = writeBatch(db);
      for (const d of snapshot.docs.slice(i, i + BATCH_LIMIT)) {
        batch.delete(d.ref);
      }
      await batch.commit();
    }
  }
  await deleteUser(user);
  // The account is gone, so a failure here doesn't undo the deletion; the page reload still follows.
  try {
    await clearLocalCache(db);
  } catch (err) {
    console.error('Could not clear the local cache after deleting the account', err);
  }
}

/**
 * Stops Firestore and deletes its IndexedDB cache, so the next person on the device can't read it
 * (spec 10.6). Firestore can't be used again afterwards: the caller loads a fresh page.
 */
async function clearLocalCache(db: Firestore): Promise<void> {
  await terminate(db);
  await clearIndexedDbPersistence(db);
}

/**
 * How long sign-out waits for unsynced writes to reach the server. A connection that is up but not
 * working (spec 10.7) never settles them, and sign-out must still end, signed in or out.
 */
export const SIGN_OUT_DEADLINE_MS = 15_000;

/** Resolves once every queued write has reached the server; rejects with code `deadline-exceeded` past the deadline. */
async function pendingWritesSettled(db: Firestore): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(
        Object.assign(new Error('Unsynced changes did not reach the server in time; still signed in.'), {
          code: 'deadline-exceeded',
        }),
      );
    }, SIGN_OUT_DEADLINE_MS);
  });
  try {
    await Promise.race([waitForPendingWrites(db), deadline]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Waits for pending writes, terminates Firestore, deletes its IndexedDB cache, then signs out. When
 * the writes don't reach the server within `SIGN_OUT_DEADLINE_MS`, it rejects with code
 * `deadline-exceeded` and changes nothing.
 */
export async function signOutAndClear(): Promise<void> {
  const { auth, db } = getServices();
  // A failure here leaves everything as it was: still signed in, nothing lost.
  await pendingWritesSettled(db);
  let clearError: unknown = null;
  try {
    await clearLocalCache(db);
  } catch (err) {
    clearError = err;
  }
  // Sign out even when the cache couldn't be cleared, then report why.
  await firebaseSignOut(auth);
  if (clearError) {
    throw clearError;
  }
}

export async function updateUserProfile(profile: { displayName: string; photoURL: string }) {
  const user = getServices().auth.currentUser;
  if (!user) {
    throw new Error('You are signed out. Please log in again.');
  }
  // Send only what changed; null clears a field that was set before.
  const changes: { displayName?: string | null; photoURL?: string | null } = {};
  const displayName = profile.displayName.trim();
  const photoURL = profile.photoURL.trim();
  if (displayName !== (user.displayName ?? '')) {
    changes.displayName = displayName || null;
  }
  if (photoURL !== (user.photoURL ?? '')) {
    changes.photoURL = photoURL || null;
  }
  if (Object.keys(changes).length) {
    await updateProfile(user, changes);
  }
  return user;
}

// ---- Firestore ----
//
// Every write makes its Firestore call before its first `await`, so once the call returns the
// write is in the local cache: offline, the stores count it as saved without waiting for the
// server (spec 10.3), and catch a later refusal themselves (spec 10.4).

/** A write already in the local cache, with the id it was given; `committed` settles when the server answers. */
export interface PendingWrite {
  docId: string;
  committed: Promise<void>;
}

export async function fetchCardSets(): Promise<CardSet[]> {
  const { db } = getServices();
  const snapshot = await getDocs(query(collection(db, SETS), where('uid', '==', requireUid())));
  return snapshot.docs.map((d) => cardSetFromDoc(d.id, d.data()));
}

export async function fetchLabels(): Promise<Label[]> {
  const { db } = getServices();
  const snapshot = await getDocs(query(collection(db, LABELS), where('uid', '==', requireUid())));
  return snapshot.docs.map((d) => labelFromDoc(d.id, d.data()));
}

/** Reads the user's stats document; a missing one reads as the default goal and no days. */
export async function fetchUserStats(): Promise<UserStats> {
  const { db } = getServices();
  const snapshot = await getDoc(doc(db, STATS, requireUid()));
  return statsFromDoc(snapshot.exists() ? snapshot.data() : undefined);
}

/** Adds `count` to the cards reviewed on `day` ('YYYY-MM-DD'); the first write creates the document. */
export async function addReviews(day: string, count: number): Promise<void> {
  const { db } = getServices();
  const uid = requireUid();
  await setDoc(doc(db, STATS, uid), { uid, days: { [day]: increment(count) } }, { merge: true });
}

/** Saves the daily goal; the first write creates the document. */
export async function saveDailyGoal(goal: number): Promise<void> {
  const { db } = getServices();
  const uid = requireUid();
  await setDoc(doc(db, STATS, uid), { uid, goal }, { merge: true });
}

/** The id is made on the device, so an offline set has its final id at once. */
export function addCardSet(set: CardSet): PendingWrite {
  const { db } = getServices();
  const ref = doc(collection(db, SETS));
  const committed = setDoc(ref, cardSetToDoc(set, requireUid()));
  return { docId: ref.id, committed };
}

export async function updateCardSet(set: CardSet): Promise<void> {
  if (!set.docId) {
    throw new Error('This set has not been saved yet.');
  }
  const { db } = getServices();
  await updateDoc(doc(db, SETS, set.docId), cardSetToDoc(set, requireUid()));
}

export async function deleteCardSet(set: CardSet): Promise<void> {
  if (!set.docId) {
    return;
  }
  const { db } = getServices();
  // A shared set takes its public copy with it (spec 11.4).
  const batch = writeBatch(db);
  batch.delete(doc(db, SETS, set.docId));
  if (set.shareId) {
    batch.delete(doc(db, SHARED, set.shareId));
  }
  await batch.commit();
}

// ---- Shared sets (spec 11) ----
//
// A shared set's public copy lives in `shared-sets/{shareId}`, and the set keeps that id in
// `shareId`. Creating or deleting the copy and setting or clearing `shareId` go in one batch, so
// neither is ever left without the other.

function savedSetRef(db: Firestore, set: CardSet) {
  if (!set.docId) {
    throw new Error('This set has not been saved yet.');
  }
  return doc(db, SETS, set.docId);
}

/** Creates the set's public copy and records its id on the set; resolves with that id. */
export async function shareCardSet(set: CardSet): Promise<string> {
  const { db } = getServices();
  const setRef = savedSetRef(db, set);
  const copyRef = doc(collection(db, SHARED));
  const batch = writeBatch(db);
  batch.set(copyRef, toSharedDoc(set, requireUid()));
  batch.update(setRef, { shareId: copyRef.id });
  await batch.commit();
  return copyRef.id;
}

/** Deletes the set's public copy and clears `shareId`; a set that isn't shared is left as it is. */
export async function unshareCardSet(set: CardSet): Promise<void> {
  if (!set.shareId) {
    return;
  }
  const { db } = getServices();
  const batch = writeBatch(db);
  batch.delete(doc(db, SHARED, set.shareId));
  batch.update(savedSetRef(db, set), { shareId: deleteField() });
  await batch.commit();
}

/** Writes the set's current title, colour and cards to its public copy; rejects `not-found` once the copy is gone. */
export async function syncSharedCopy(set: CardSet): Promise<void> {
  if (!set.shareId) {
    throw new Error('This set is not shared.');
  }
  const { db } = getServices();
  await updateDoc(doc(db, SHARED, set.shareId), toSharedDoc(set, requireUid()));
}

/** Clears `shareId` on the set alone, for when its public copy has gone. */
export async function clearShareId(set: CardSet): Promise<void> {
  const { db } = getServices();
  await updateDoc(savedSetRef(db, set), { shareId: deleteField() });
}

/** Reads a public copy, signed in or not; null when the id isn't a share id or the copy is gone. */
export async function fetchSharedSet(shareId: string): Promise<SharedSet | null> {
  // Checked first, so a crafted link can never name another collection's document.
  if (!isShareId(shareId)) {
    return null;
  }
  const { db } = getServices();
  const snapshot = await getDoc(doc(db, SHARED, shareId));
  return snapshot.exists() ? sharedSetFromDoc(shareId, snapshot.data()) : null;
}

/** The id is made on the device, so an offline label has its final id at once. */
export function addLabel(label: string): PendingWrite {
  const { db } = getServices();
  const ref = doc(collection(db, LABELS));
  const committed = setDoc(ref, { label, uid: requireUid() });
  return { docId: ref.id, committed };
}

export async function renameLabel(docId: string, label: string): Promise<void> {
  const { db } = getServices();
  await updateDoc(doc(db, LABELS, docId), { label, uid: requireUid() });
}
