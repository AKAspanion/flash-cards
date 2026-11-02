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

  it('treats a closed popup as a cancel, not an error', () => {
    expect(isAuthCancel({ code: 'auth/popup-closed-by-user' })).toBe(true);
    expect(isAuthCancel({ code: 'auth/unauthorized-domain' })).toBe(false);
  });
});
