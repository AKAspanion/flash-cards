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
  addDoc,
  collection,
  connectFirestoreEmulator,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  query,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import type { CardSet, Label } from '@/types';
import { authDomainFor } from './authDomain';
import { emulatorHostFor } from './emulatorHost';
import { OWNED_COLLECTIONS } from './ownedCollections';
import { cardSetFromDoc, cardSetToDoc, labelFromDoc } from './cardSetMapper';
import { DEV_PORTS } from '../../dev-ports';

const SETS = 'flash-card-sets';
const LABELS = 'labels';

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
  const db = getFirestore(app);
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
}

export function signOut() {
  return firebaseSignOut(getServices().auth);
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

/** Returns the new document id. */
export async function addCardSet(set: CardSet): Promise<string> {
  const { db } = getServices();
  const ref = await addDoc(collection(db, SETS), cardSetToDoc(set, requireUid()));
  return ref.id;
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
  await deleteDoc(doc(db, SETS, set.docId));
}

/** Returns the new document id. */
export async function addLabel(label: string): Promise<string> {
  const { db } = getServices();
  const ref = await addDoc(collection(db, LABELS), { label, uid: requireUid() });
  return ref.id;
}

export async function renameLabel(docId: string, label: string): Promise<void> {
  const { db } = getServices();
  await updateDoc(doc(db, LABELS, docId), { label, uid: requireUid() });
}
