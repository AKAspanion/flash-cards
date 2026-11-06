import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter, type Router, type RouteRecordRaw } from 'vue-router';
import type { SessionUser } from '@/types';

const api = vi.hoisted(() => ({
  signUpWithEmail: vi.fn(),
  signInWithEmail: vi.fn(),
  signInWithGoogle: vi.fn(),
  getRedirectOutcome: vi.fn(),
  getAuthUser: vi.fn(),
  onUserChanged: vi.fn(),
  sendVerificationEmail: vi.fn(),
  reloadEmailVerified: vi.fn(),
  setAuthLanguage: vi.fn(),
}));
vi.mock('@/services/firebase', () => api);
vi.mock('@/services/appBadge', () => ({ updateAppBadge: vi.fn() }));

const { default: vuetify } = await import('@/plugins/vuetify');
const { default: i18n } = await import('@/plugins/i18n');
const { useSessionStore } = await import('@/stores/session');
const { useAccountStore } = await import('@/stores/account');
const { default: BannerVerifyEmail } = await import('@/components/BannerVerifyEmail.vue');
const { default: App } = await import('@/App.vue');
const { default: Login } = await import('@/views/Login.vue');
const { routes } = await import('@/router');

const BANNER_TEXT = 'Verify your email to keep your account safe.';
const RESEND = 'Resend email';
const CHECK = "I've verified";
const DISMISS = 'Dismiss';
const DAY = 86_400_000;
const DISMISS_KEY = 'flashcards.verifyBannerDismissedAt.u1';

const Page = defineComponent({ render: () => h('div', { class: 'test-page' }, 'page') });

// The app's own route table, so each route's meta is the real one; only the views are swapped for a stub page.
function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: routes.map((r) => ('component' in r ? { ...r, component: Page } : r)) as RouteRecordRaw[],
  });
}

function makeUser(emailVerified: boolean): SessionUser {
  return {
    uid: 'u1',
    email: 'a@example.test',
    displayName: '',
    photoURL: '',
    creationTime: '',
    lastSignInTime: '',
    emailVerified,
  };
}

let wrapper: VueWrapper | null = null;

async function mountAt(component: unknown, path: string, user: SessionUser | null) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const session = useSessionStore();
  session.user = user;
  const router = makeRouter();
  await router.push(path);
  await router.isReady();
  wrapper = mount(component as Parameters<typeof mount>[0], {
    global: { plugins: [vuetify, i18n, pinia, router], stubs: { BarNav: true } },
    attachTo: document.body,
  });
  await flushPromises();
  return { session, router, account: useAccountStore() };
}

function banner() {
  return wrapper!.find('.v-banner');
}

function hasButton(label: string): boolean {
  return wrapper!.findAll('button').some((b) => b.text() === label);
}

function button(label: string | RegExp) {
  const found = wrapper!.findAll('button').find((b) => (typeof label === 'string' ? b.text() === label : label.test(b.text())));
  if (!found) {
    throw new Error(`No button ${label}`);
  }
  return found;
}

/** The live regions that contain `el`: role status or alert, or any aria-live, on it or an ancestor. */
function liveRegionsAround(el: Element): string[] {
  const found: string[] = [];
  for (let node: Element | null = el; node; node = node.parentElement) {
    const role = node.getAttribute('role');
    if (role === 'status' || role === 'alert' || node.hasAttribute('aria-live')) {
      found.push(node.outerHTML.slice(0, 80));
    }
  }
  return found;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  vi.useRealTimers();
});

describe('BannerVerifyEmail in the app', () => {
  it('sits at the top of v-main, above the page, for an unverified user on a signed-in route', async () => {
    await mountAt(App, '/home', makeUser(false));
    const main = wrapper!.find('main.v-main');
    expect(main.exists()).toBe(true);
    const region = main.find('.v-banner');
    expect(region.exists()).toBe(true);
    expect(region.text()).toContain(BANNER_TEXT);
    // A region named by its own text, not a live region.
    expect(region.attributes('role')).toBe('region');
    expect(document.getElementById(region.attributes('aria-labelledby')!)?.textContent?.trim()).toBe(BANNER_TEXT);
    // The banner comes before the routed page inside v-main.
    const html = main.html();
    expect(html.indexOf('v-banner')).toBeGreaterThan(-1);
    expect(html.indexOf('v-banner')).toBeLessThan(html.indexOf('test-page'));
    expect(button(RESEND).exists()).toBe(true);
    expect(button(DISMISS).exists()).toBe(true);
  });

  it('sits at the top of v-main on /profile too', async () => {
    await mountAt(App, '/profile', makeUser(false));
    const main = wrapper!.find('main.v-main');
    expect(main.find('.v-banner').exists()).toBe(true);
    expect(main.html().indexOf('v-banner')).toBeLessThan(main.html().indexOf('test-page'));
  });
});

describe('BannerVerifyEmail visibility', () => {
  it('renders nothing for a verified user', async () => {
    await mountAt(BannerVerifyEmail, '/home', makeUser(true));
    expect(banner().exists()).toBe(false);
  });

  it('renders nothing with no user', async () => {
    // The router sends a signed-out user away from /home; this checks the banner's own guard.
    await mountAt(BannerVerifyEmail, '/home', null);
    expect(banner().exists()).toBe(false);
  });

  it.each(['/login', '/privacy', '/delete-account'])('renders nothing on %s, which does not require sign-in', async (path) => {
    await mountAt(BannerVerifyEmail, path, makeUser(false));
    expect(banner().exists()).toBe(false);
  });

  it.each(['/home', '/profile'])('renders on %s for an unverified user', async (path) => {
    await mountAt(BannerVerifyEmail, path, makeUser(false));
    expect(banner().exists()).toBe(true);
    expect(banner().text()).toContain(BANNER_TEXT);
  });

  // These screens size themselves against the viewport; a banner above them would push them off screen.
  it.each(['/add', '/s1/edit', '/s1/view', '/due'])('renders nothing on %s, a full-height screen', async (path) => {
    await mountAt(BannerVerifyEmail, path, makeUser(false));
    expect(banner().exists()).toBe(false);
  });

  // Only Home and Profile show it, as the developer asked on 2026-11-06.
  it.each(['/settings', '/stats', '/bin', '/info'])('renders nothing on %s', async (path) => {
    await mountAt(BannerVerifyEmail, path, makeUser(false));
    expect(banner().exists()).toBe(false);
  });

  it('appears once the route moves to Home', async () => {
    const { router } = await mountAt(BannerVerifyEmail, '/privacy', makeUser(false));
    expect(banner().exists()).toBe(false);
    await router.push('/home');
    await flushPromises();
    expect(banner().exists()).toBe(true);
  });

  it('on Home with no dismissal stored, offers Resend email and Dismiss, not I\'ve verified', async () => {
    await mountAt(BannerVerifyEmail, '/home', makeUser(false));
    expect(banner().exists()).toBe(true);
    expect(hasButton(RESEND)).toBe(true);
    expect(hasButton(DISMISS)).toBe(true);
    expect(hasButton(CHECK)).toBe(false);
  });

  it('on Home, stays hidden while the dismissal is 3 days old', async () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now() - 3 * DAY));
    await mountAt(BannerVerifyEmail, '/home', makeUser(false));
    expect(banner().exists()).toBe(false);
  });

  it('on Home, shows again once the dismissal is 8 days old', async () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now() - 8 * DAY));
    await mountAt(BannerVerifyEmail, '/home', makeUser(false));
    expect(banner().exists()).toBe(true);
  });

  it("on /profile, shows with Resend email and I've verified, and no Dismiss, even after a fresh dismissal", async () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    await mountAt(BannerVerifyEmail, '/profile', makeUser(false));
    expect(banner().exists()).toBe(true);
    expect(hasButton(RESEND)).toBe(true);
    expect(hasButton(CHECK)).toBe(true);
    expect(hasButton(DISMISS)).toBe(false);
  });

  it("shows another user's banner on Home when only the first user dismissed it", async () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    await mountAt(BannerVerifyEmail, '/home', { ...makeUser(false), uid: 'u2', email: 'b@example.test' });
    expect(banner().exists()).toBe(true);
  });
});

describe('BannerVerifyEmail dismiss on Home', () => {
  it('hides at once, then, while the quiet check says not verified, stores the time with no snack', async () => {
    const { session } = await mountAt(BannerVerifyEmail, '/home', makeUser(false));
    const pending = deferred<boolean>();
    api.reloadEmailVerified.mockReturnValue(pending.promise);
    const before = Date.now();

    await button(DISMISS).trigger('click');
    // Hidden before the check answers.
    expect(banner().exists()).toBe(false);
    expect(api.reloadEmailVerified).toHaveBeenCalledOnce();
    pending.resolve(false);
    await flushPromises();

    expect(banner().exists()).toBe(false);
    expect(session.snack.text).toBe('');
    const stored = Number(localStorage.getItem(DISMISS_KEY));
    expect(stored).toBeGreaterThanOrEqual(before);
    expect(stored).toBeLessThanOrEqual(Date.now());
  });

  it('marks the user verified, and stores nothing, when the email was verified in another tab', async () => {
    const { session, router } = await mountAt(BannerVerifyEmail, '/home', makeUser(false));
    api.reloadEmailVerified.mockResolvedValue(true);

    await button(DISMISS).trigger('click');
    await flushPromises();

    expect(banner().exists()).toBe(false);
    expect(session.user?.emailVerified).toBe(true);
    expect(localStorage.getItem(DISMISS_KEY)).toBeNull();
    // Gone everywhere, /profile included.
    await router.push('/profile');
    await flushPromises();
    expect(banner().exists()).toBe(false);
  });

  it('stores the dismissal, with no error snack, when the quiet check fails', async () => {
    const { session } = await mountAt(BannerVerifyEmail, '/home', makeUser(false));
    api.reloadEmailVerified.mockRejectedValue(
      Object.assign(new Error('Firebase: Error (auth/network-request-failed).'), { code: 'auth/network-request-failed' }),
    );
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});

    await button(DISMISS).trigger('click');
    await flushPromises();

    expect(log).toHaveBeenCalledOnce();
    log.mockRestore();
    expect(banner().exists()).toBe(false);
    expect(session.snack.text).toBe('');
    expect(localStorage.getItem(DISMISS_KEY)).not.toBeNull();
  });

  it('offline, skips the check and stores the dismissal, with no snack', async () => {
    const { session } = await mountAt(BannerVerifyEmail, '/home', makeUser(false));
    session.online = false;

    await button(DISMISS).trigger('click');
    await flushPromises();

    expect(api.reloadEmailVerified).not.toHaveBeenCalled();
    expect(banner().exists()).toBe(false);
    expect(session.snack.text).toBe('');
    expect(localStorage.getItem(DISMISS_KEY)).not.toBeNull();
  });

  it('still shows on /profile after a dismissal on Home', async () => {
    const { router } = await mountAt(BannerVerifyEmail, '/home', makeUser(false));
    api.reloadEmailVerified.mockResolvedValue(false);
    await button(DISMISS).trigger('click');
    await flushPromises();

    await router.push('/profile');
    await flushPromises();
    expect(banner().exists()).toBe(true);
    expect(hasButton(CHECK)).toBe(true);
  });

  it('shows on Home for the next user who signs in on this browser', async () => {
    const { session } = await mountAt(BannerVerifyEmail, '/home', makeUser(false));
    api.reloadEmailVerified.mockResolvedValue(false);
    await button(DISMISS).trigger('click');
    await flushPromises();
    expect(banner().exists()).toBe(false);

    session.user = { ...makeUser(false), uid: 'u2', email: 'b@example.test' };
    await flushPromises();
    expect(banner().exists()).toBe(true);
    expect(localStorage.getItem('flashcards.verifyBannerDismissedAt.u2')).toBeNull();
  });
});

describe('BannerVerifyEmail resend', () => {
  it('disables Resend and counts down 60 seconds after a send, then enables it again', async () => {
    vi.useFakeTimers();
    const { account } = await mountAt(BannerVerifyEmail, '/home', makeUser(false));
    const resend = vi.spyOn(account, 'resendVerification').mockResolvedValue(true);

    await button(RESEND).trigger('click');
    await flushPromises();
    expect(resend).toHaveBeenCalledTimes(1);
    expect(button(/^Resend email/).attributes('disabled')).toBeDefined();
    expect(button(/^Resend email/).text()).toBe('Resend email (60)');

    await vi.advanceTimersByTimeAsync(1000);
    expect(button(/^Resend email/).text()).toBe('Resend email (59)');
    expect(button(/^Resend email/).attributes('disabled')).toBeDefined();
    // The countdown changes every second, so no live region may hold it, or a screen reader re-reads it each tick.
    expect(liveRegionsAround(button(/^Resend email/).element)).toEqual([]);

    await vi.advanceTimersByTimeAsync(58_000);
    expect(button(/^Resend email/).text()).toBe('Resend email (1)');

    await vi.advanceTimersByTimeAsync(1000);
    expect(button(RESEND).attributes('disabled')).toBeUndefined();
    expect(button(RESEND).text()).toBe(RESEND);
  });

  it('enables Resend again at once when the send fails', async () => {
    const { account } = await mountAt(BannerVerifyEmail, '/home', makeUser(false));
    const pending = deferred<boolean>();
    vi.spyOn(account, 'resendVerification').mockReturnValue(pending.promise);

    await button(RESEND).trigger('click');
    // Busy while the send runs, so a second press can't send twice.
    expect(button(RESEND).attributes('disabled')).toBeDefined();
    pending.resolve(false);
    await flushPromises();
    expect(button(RESEND).attributes('disabled')).toBeUndefined();
    expect(button(RESEND).text()).toBe(RESEND);
  });
});

describe('BannerVerifyEmail check', () => {
  it('shows loading until the check settles, then hides the banner once verified', async () => {
    const { account, session } = await mountAt(BannerVerifyEmail, '/profile', makeUser(false));
    const pending = deferred<boolean>();
    vi.spyOn(account, 'checkVerified').mockImplementation(async () => {
      const verified = await pending.promise;
      if (verified) {
        session.patchUser({ emailVerified: true });
      }
      return verified;
    });

    await button(CHECK).trigger('click');
    expect(button(CHECK).classes()).toContain('v-btn--loading');
    pending.resolve(true);
    await flushPromises();
    expect(banner().exists()).toBe(false);
  });

  it('keeps the banner and ends loading when not verified yet', async () => {
    const { account } = await mountAt(BannerVerifyEmail, '/profile', makeUser(false));
    vi.spyOn(account, 'checkVerified').mockResolvedValue(false);

    await button(CHECK).trigger('click');
    await flushPromises();
    expect(banner().exists()).toBe(true);
    expect(button(CHECK).classes()).not.toContain('v-btn--loading');
  });
});

describe('Login sign-up message', () => {
  async function signUp() {
    const { session, router } = await mountAt(Login, '/login', null);
    await button('Sign up').trigger('click');
    await flushPromises();
    const inputs = wrapper!.findAll('input');
    await inputs[0].setValue('new@example.test');
    await inputs[1].setValue('secret1');
    await inputs[2].setValue('secret1');
    await wrapper!.find('form').trigger('submit');
    await flushPromises();
    return { session, router };
  }

  it('says to check the inbox when the verification email was sent', async () => {
    api.signUpWithEmail.mockResolvedValue({ verificationSent: true });
    const { session, router } = await signUp();
    expect(api.signUpWithEmail).toHaveBeenCalledWith('new@example.test', 'secret1');
    expect(session.snack.text).toBe('Account created. Check your inbox to verify your email.');
    expect(router.currentRoute.value.path).toBe('/home');
  });

  it('says only that the account was created when the email did not send', async () => {
    api.signUpWithEmail.mockResolvedValue({ verificationSent: false });
    const { session, router } = await signUp();
    expect(session.snack.text).toBe('Account created successfully!');
    expect(router.currentRoute.value.path).toBe('/home');
  });
});
