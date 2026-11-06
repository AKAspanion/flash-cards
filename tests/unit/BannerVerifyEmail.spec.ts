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
    expect(button(CHECK).exists()).toBe(true);
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

  it('appears once the route moves to a signed-in screen', async () => {
    const { router } = await mountAt(BannerVerifyEmail, '/privacy', makeUser(false));
    expect(banner().exists()).toBe(false);
    await router.push('/home');
    await flushPromises();
    expect(banner().exists()).toBe(true);
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
    const { account, session } = await mountAt(BannerVerifyEmail, '/home', makeUser(false));
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
    const { account } = await mountAt(BannerVerifyEmail, '/home', makeUser(false));
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
