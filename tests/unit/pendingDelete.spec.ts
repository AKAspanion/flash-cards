import { beforeEach, describe, expect, it } from 'vitest';
import {
  PENDING_DELETE_KEY,
  clearPendingDelete,
  readPendingDelete,
  shouldResumeDeletion,
  writePendingDelete,
} from '@/utils/pendingDelete';

const now = 1_000_000_000;
const reauth = { operationType: 'reauthenticate', uid: 'u1' } as const;

describe('shouldResumeDeletion', () => {
  it('resumes for a fresh reauthentication by the same user', () => {
    expect(shouldResumeDeletion({ uid: 'u1', at: now - 60_000 }, reauth, 'u1', now)).toBe(true);
  });

  it('does not resume once five minutes have passed', () => {
    expect(shouldResumeDeletion({ uid: 'u1', at: now - 300_001 }, reauth, 'u1', now)).toBe(false);
  });

  it('does not resume for a stored time in the future', () => {
    expect(shouldResumeDeletion({ uid: 'u1', at: now + 60_000 }, reauth, 'u1', now)).toBe(false);
  });

  it('does not resume when the stored uid is another user', () => {
    expect(shouldResumeDeletion({ uid: 'u2', at: now - 1000 }, reauth, 'u1', now)).toBe(false);
  });

  it('does not resume when the outcome is another user', () => {
    expect(shouldResumeDeletion({ uid: 'u1', at: now - 1000 }, { ...reauth, uid: 'u2' }, 'u1', now)).toBe(false);
  });

  it('does not resume for a plain sign-in', () => {
    expect(
      shouldResumeDeletion({ uid: 'u1', at: now - 1000 }, { operationType: 'signIn', uid: 'u1' }, 'u1', now),
    ).toBe(false);
  });

  it('does not resume for a failed redirect', () => {
    expect(shouldResumeDeletion({ uid: 'u1', at: now - 1000 }, { error: new Error('x') }, 'u1', now)).toBe(false);
  });

  it('does not resume with nothing stored or no outcome', () => {
    expect(shouldResumeDeletion(null, reauth, 'u1', now)).toBe(false);
    expect(shouldResumeDeletion({ uid: 'u1', at: now }, null, 'u1', now)).toBe(false);
  });
});

describe('pending delete storage', () => {
  beforeEach(() => sessionStorage.clear());

  it('round-trips and clears', () => {
    writePendingDelete(sessionStorage, { uid: 'u1', at: 5 });
    expect(readPendingDelete(sessionStorage)).toEqual({ uid: 'u1', at: 5 });
    clearPendingDelete(sessionStorage);
    expect(readPendingDelete(sessionStorage)).toBeNull();
  });

  it('reads garbage as nothing pending', () => {
    sessionStorage.setItem(PENDING_DELETE_KEY, 'not json');
    expect(readPendingDelete(sessionStorage)).toBeNull();
    sessionStorage.setItem(PENDING_DELETE_KEY, JSON.stringify({ uid: 1, at: 'x' }));
    expect(readPendingDelete(sessionStorage)).toBeNull();
  });
});
