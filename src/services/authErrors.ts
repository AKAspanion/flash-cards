// Maps Firebase Auth error codes to i18n keys; anything unknown shows `auth.error.generic`, never Firebase's message.
const AUTH_ERROR_KEYS: Record<string, string> = {
  'auth/invalid-credential': 'auth.error.invalid-credential',
  'auth/wrong-password': 'auth.error.invalid-credential',
  'auth/user-not-found': 'auth.error.invalid-credential',
  'auth/invalid-email': 'auth.error.invalid-email',
  'auth/missing-email': 'email.enter',
  'auth/email-already-in-use': 'auth.error.email-in-use',
  'auth/weak-password': 'auth.error.weak-password',
  'auth/too-many-requests': 'auth.error.too-many-requests',
  'auth/network-request-failed': 'auth.error.network',
  'auth/user-mismatch': 'auth.error.user-mismatch',
  'auth/requires-recent-login': 'auth.error.recent-login',
  'auth/operation-not-allowed': 'auth.error.not-allowed',
  'auth/user-disabled': 'auth.error.disabled',
  'auth/unauthorized-domain': 'auth.error.unauthorized-domain',
  // A reset request can fail on the project's setup or its sending quota: nothing the user typed.
  'auth/unauthorized-continue-uri': 'auth.error.reset-unavailable',
  'auth/invalid-continue-uri': 'auth.error.reset-unavailable',
  'auth/quota-exceeded': 'auth.error.reset-unavailable',
};

/** Sign-in cancelled by the user: not worth an error message. */
export function isAuthCancel(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  return code === 'auth/redirect-cancelled-by-user' || code === 'auth/user-cancelled';
}

export function authErrorMessage(err: unknown, t: (key: string) => string): string {
  const code = (err as { code?: string })?.code;
  if (typeof code === 'string' && Object.hasOwn(AUTH_ERROR_KEYS, code)) {
    return t(AUTH_ERROR_KEYS[code]);
  }
  // Its own message never reaches the user, so the console is the only place the cause shows.
  console.error(err);
  return t('auth.error.generic');
}
