import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';

const api = vi.hoisted(() => ({
  getAuthUser: vi.fn(),
  onUserChanged: vi.fn(),
  fetchCardSets: vi.fn(),
  fetchLabels: vi.fn(),
  fetchUserStats: vi.fn(),
}));
vi.mock('@/services/firebase', () => api);

const fresh = vi.hoisted(() => ({ loadFresh: vi.fn(), takePendingSnack: vi.fn(() => null) }));
vi.mock('@/utils/freshLoad', () => fresh);

const { default: router, authRedirect, safeRedirect } = await import('@/router');
const { useStatsStore } = await import('@/stores/stats');
const { useLibraryStore } = await import('@/stores/library');
const { useSessionStore } = await import('@/stores/session');
const { createPinia, setActivePinia } = await import('pinia');

const route = (fullPath: string, requireAuth?: boolean, query: Record<string, unknown> = {}, isPublic?: boolean) => ({
  fullPath,
  meta: { requireAuth, public: isPublic },
  query,
});

describe('authRedirect', () => {
  it('sends signed-out users to login and remembers where they were going', () => {
    expect(authRedirect(route('/profile', true), false)).toEqual({ path: '/login', query: { redirect: '/profile' } });
  });

  it('lets signed-in users through to protected pages', () => {
    expect(authRedirect(route('/home', true), true)).toBe(true);
  });

  it('lets signed-out users see the login page', () => {
    expect(authRedirect(route('/login'), false)).toBe(true);
  });

  it('sends signed-in users away from login to their redirect target', () => {
    expect(authRedirect(route('/login', undefined, { redirect: '/bin' }), true)).toBe('/bin');
    expect(authRedirect(route('/login'), true)).toBe('/home');
  });
});

describe('authRedirect for the due review', () => {
  it('sends signed-out users to login with /due as the redirect', () => {
    expect(authRedirect(route('/due', true), false)).toEqual({ path: '/login', query: { redirect: '/due' } });
  });

  it('lets signed-in users through', () => {
    expect(authRedirect(route('/due', true), true)).toBe(true);
  });

  it('marks /due as a protected route', () => {
    const due = router.getRoutes().find((r) => r.path === '/due');
    expect(due?.name).toBe('due');
    expect(due?.meta.requireAuth).toBe(true);
  });
});

describe('authRedirect for the stats page', () => {
  it('sends signed-out users to login with /stats as the redirect', () => {
    expect(authRedirect(route('/stats', true), false)).toEqual({ path: '/login', query: { redirect: '/stats' } });
  });

  it('lets signed-in users through', () => {
    expect(authRedirect(route('/stats', true), true)).toBe(true);
  });

  it('marks /stats as a protected route', () => {
    const stats = router.getRoutes().find((r) => r.path === '/stats');
    expect(stats?.name).toBe('stats');
    expect(stats?.meta.requireAuth).toBe(true);
  });
});

describe('authRedirect for public routes', () => {
  it('lets signed-out and signed-in users through, even with a redirect query', () => {
    expect(authRedirect(route('/privacy', undefined, {}, true), false)).toBe(true);
    expect(authRedirect(route('/privacy', undefined, {}, true), true)).toBe(true);
    expect(authRedirect(route('/privacy', undefined, { redirect: '/bin' }, true), true)).toBe(true);
  });

  it('lets anyone open a shared-set link, even with a redirect query', () => {
    expect(authRedirect(route('/s/abc', undefined, {}, true), false)).toBe(true);
    expect(authRedirect(route('/s/abc', undefined, {}, true), true)).toBe(true);
    expect(authRedirect(route('/s/abc', undefined, { redirect: '/bin' }, true), false)).toBe(true);
    expect(authRedirect(route('/s/abc', undefined, { redirect: '/bin' }, true), true)).toBe(true);
  });

  it('sends a signed-in user from login back to the shared-set link', () => {
    const login = route('/login?redirect=/s/AbCdEfGhIjKlMnOpQrSt', undefined, { redirect: '/s/AbCdEfGhIjKlMnOpQrSt' });
    expect(authRedirect(login, true)).toBe('/s/AbCdEfGhIjKlMnOpQrSt');
  });

  it('routes /s/:shareId to the public shared-set page, ahead of the catch-all', () => {
    const resolved = router.resolve('/s/AbCdEfGhIjKlMnOpQrSt');
    expect(resolved.name).toBe('shared');
    expect(resolved.params.shareId).toBe('AbCdEfGhIjKlMnOpQrSt');
    expect(resolved.meta.public).toBe(true);
    expect(resolved.meta.requireAuth).toBeUndefined();
  });

  it('routes a malformed share id to the shared-set page too, which shows the missing-link state', () => {
    expect(router.resolve('/s/not-a-valid-id!').name).toBe('shared');
  });
});

describe('full-height screens', () => {
  it('marks exactly the study screens and the editor, whose layouts size themselves against the viewport', () => {
    const fullHeight = router
      .getRoutes()
      .filter((r) => r.meta.fullHeight)
      .map((r) => r.name)
      .sort();
    expect(fullHeight).toEqual(['add', 'due', 'edit', 'view']);
  });
});

describe('safeRedirect', () => {
  it('only accepts in-app paths', () => {
    expect(safeRedirect('/abc/view')).toBe('/abc/view');
    expect(safeRedirect('//evil.example')).toBe('/home');
    expect(safeRedirect('https://evil.example')).toBe('/home');
    expect(safeRedirect(['/a'])).toBe('/home');
    expect(safeRedirect(undefined)).toBe('/home');
  });
});

describe('auth changes outside navigation', () => {
  const user = (uid: string) => ({ uid, email: '', displayName: '', photoURL: '', metadata: {} }) as User;
  let callback: (user: User | null) => void;

  beforeAll(async () => {
    setActivePinia(createPinia());
    api.getAuthUser.mockResolvedValue(user('alice'));
    api.onUserChanged.mockImplementation((cb) => (callback = cb));
    api.fetchCardSets.mockResolvedValue([]);
    api.fetchLabels.mockResolvedValue([]);
    api.fetchUserStats.mockResolvedValue({ goal: 50, days: {} });
    await router.push('/home');
  });

  // Each test starts signed in as someone new, so it passes in any order.
  let signIns = 0;
  beforeEach(() => {
    callback(user(`user-${++signIns}`));
    useSessionStore().signingOut = false;
    fresh.loadFresh.mockClear();
  });

  it('resets the stats store, like the library store, on sign-out', () => {
    const stats = useStatsStore();
    const library = useLibraryStore();
    const statsReset = vi.spyOn(stats, 'reset');
    const libraryReset = vi.spyOn(library, 'reset');
    callback(null);
    expect(libraryReset).toHaveBeenCalled();
    expect(statsReset).toHaveBeenCalled();
  });

  it('loads /login as a new page when signed out elsewhere, so Firestore starts afresh', () => {
    callback(null);
    expect(fresh.loadFresh).toHaveBeenCalledWith('/login');
  });

  it('leaves the reload to this tab while it signs out or deletes the account itself', () => {
    useSessionStore().signingOut = true;
    callback(null);
    expect(fresh.loadFresh).not.toHaveBeenCalled();
  });

  it('resets the stats store before anything loads for a different user', () => {
    const stats = useStatsStore();
    const library = useLibraryStore();
    const order: string[] = [];
    vi.spyOn(stats, 'reset').mockImplementation(() => void order.push('stats.reset'));
    vi.spyOn(library, 'load').mockImplementation(() => (order.push('library.load'), Promise.resolve()));
    callback(user('bob'));
    expect(order.indexOf('stats.reset')).toBeGreaterThanOrEqual(0);
    expect(order.indexOf('stats.reset')).toBeLessThan(order.indexOf('library.load'));
  });
});
