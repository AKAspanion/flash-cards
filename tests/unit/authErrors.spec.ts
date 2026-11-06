import { describe, expect, it } from 'vitest';
import { authErrorMessage, isAuthCancel } from '@/services/authErrors';

const t = (key: string) => `t:${key}`;

describe('authErrorMessage', () => {
  it('maps known Firebase codes to translated messages', () => {
    expect(authErrorMessage({ code: 'auth/invalid-credential' }, t)).toBe('t:auth.error.invalid-credential');
    expect(authErrorMessage({ code: 'auth/unauthorized-domain' }, t)).toBe('t:auth.error.unauthorized-domain');
  });

  it('falls back to the raw message, then a generic one', () => {
    expect(authErrorMessage({ code: 'auth/other', message: 'Raw' }, t)).toBe('Raw');
    expect(authErrorMessage({}, t)).toBe('t:auth.error.generic');
  });

  it('maps re-authentication errors', () => {
    expect(authErrorMessage({ code: 'auth/user-mismatch' }, t)).toBe('t:auth.error.user-mismatch');
    expect(authErrorMessage({ code: 'auth/requires-recent-login' }, t)).toBe('t:auth.error.recent-login');
  });

  it('maps a missing email address to the same wording the form rule uses', () => {
    expect(authErrorMessage({ code: 'auth/missing-email', message: 'Raw' }, t)).toBe('t:email.enter');
  });

  it.each(['auth/unauthorized-continue-uri', 'auth/invalid-continue-uri', 'auth/quota-exceeded'])(
    'maps %s, a reset failure the user cannot fix, to translated text',
    (code) => {
      expect(authErrorMessage({ code, message: 'Raw' }, t)).toBe('t:auth.error.reset-unavailable');
    },
  );

  it('no longer maps a blocked popup', () => {
    expect(authErrorMessage({ code: 'auth/popup-blocked', message: 'Raw' }, t)).toBe('Raw');
  });

  it('treats only a cancelled redirect as a cancel, not an error', () => {
    expect(isAuthCancel({ code: 'auth/redirect-cancelled-by-user' })).toBe(true);
    expect(isAuthCancel({ code: 'auth/user-cancelled' })).toBe(true);
    expect(isAuthCancel({ code: 'auth/popup-closed-by-user' })).toBe(false);
    expect(isAuthCancel({ code: 'auth/unauthorized-domain' })).toBe(false);
  });
});
