import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authErrorMessage, isAuthCancel } from '@/services/authErrors';

const t = (key: string) => `t:${key}`;

describe('authErrorMessage', () => {
  beforeEach(() => {
    // An unmapped error is logged, since its own message never reaches the user.
    vi.spyOn(console, 'error').mockImplementation(() => {});
    return () => vi.restoreAllMocks();
  });

  it('maps known Firebase codes to translated messages', () => {
    expect(authErrorMessage({ code: 'auth/invalid-credential' }, t)).toBe('t:auth.error.invalid-credential');
    expect(authErrorMessage({ code: 'auth/unauthorized-domain' }, t)).toBe('t:auth.error.unauthorized-domain');
  });

  it("shows the generic text for an unmapped code, never Firebase's message, and logs the code", () => {
    const err = { code: 'auth/some-unmapped-code', message: 'Firebase: Error (auth/some-unmapped-code).' };
    expect(authErrorMessage(err, t)).toBe('t:auth.error.generic');
    expect(console.error).toHaveBeenCalledWith('Unmapped auth error:', 'auth/some-unmapped-code');
    expect(authErrorMessage(new Error('Raw'), t)).toBe('t:auth.error.generic');
    expect(console.error).toHaveBeenLastCalledWith('Unmapped auth error:', 'Error');
    expect(authErrorMessage({}, t)).toBe('t:auth.error.generic');
    expect(authErrorMessage(null, t)).toBe('t:auth.error.generic');
  });

  it("logs only an unmapped error's code, never its address or tokens", () => {
    const err = Object.assign(new Error('Firebase: Error (auth/account-exists-with-different-credential).'), {
      code: 'auth/account-exists-with-different-credential',
      customData: { email: 'a@b.test', _tokenResponse: { oauthAccessToken: 'tok' } },
    });
    expect(authErrorMessage(err, t)).toBe('t:auth.error.generic');
    const logged = vi.mocked(console.error).mock.calls.map((args) => args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')).join('\n');
    expect(logged).toContain('auth/account-exists-with-different-credential');
    expect(logged).not.toContain('a@b.test');
    expect(logged).not.toContain('tok');
    expect(vi.mocked(console.error).mock.calls.flat()).not.toContain(err);
  });

  it.each(['constructor', '__proto__', 'toString'])('treats the prototype key %s as unmapped', (code) => {
    expect(authErrorMessage({ code, message: 'Raw' }, t)).toBe('t:auth.error.generic');
  });

  it('still maps a known code even when the error has a message', () => {
    expect(authErrorMessage({ code: 'auth/invalid-credential', message: 'Raw' }, t)).toBe('t:auth.error.invalid-credential');
    expect(console.error).not.toHaveBeenCalled();
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
    expect(authErrorMessage({ code: 'auth/popup-blocked', message: 'Raw' }, t)).toBe('t:auth.error.generic');
  });

  it('treats only a cancelled redirect as a cancel, not an error', () => {
    expect(isAuthCancel({ code: 'auth/redirect-cancelled-by-user' })).toBe(true);
    expect(isAuthCancel({ code: 'auth/user-cancelled' })).toBe(true);
    expect(isAuthCancel({ code: 'auth/popup-closed-by-user' })).toBe(false);
    expect(isAuthCancel({ code: 'auth/unauthorized-domain' })).toBe(false);
  });
});
