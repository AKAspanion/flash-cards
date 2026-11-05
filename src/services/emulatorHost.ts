const LOOPBACK_HOSTS = ['localhost', '127.0.0.1'];

/**
 * The host the app connects to the emulators on: the page's own loopback hostname, so the
 * Auth emulator's redirect iframe is same-site with the app. On a different hostname
 * (`localhost` page, `127.0.0.1` emulator) the browser partitions the iframe's storage and
 * a Google sign-in redirect comes back with no result. Anything else uses `127.0.0.1`.
 */
export function emulatorHostFor(pageHostname: string | undefined): string {
  return pageHostname && LOOPBACK_HOSTS.includes(pageHostname) ? pageHostname : '127.0.0.1';
}
