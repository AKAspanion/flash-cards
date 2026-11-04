/**
 * The Firebase auth domain: the host serving the app, so Google's handler is same-origin
 * and the redirect survives browsers that partition third-party storage.
 * Emulators and non-browser runs use the configured domain.
 */
export function authDomainFor(host: string | undefined, useEmulators: boolean, configured: string): string {
  return host && !useEmulators ? host : configured;
}
