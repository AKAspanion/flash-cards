import { describe, expect, it } from 'vitest';
import router, { authRedirect, safeRedirect } from '@/router';

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

describe('authRedirect for public routes', () => {
  it('lets signed-out and signed-in users through, even with a redirect query', () => {
    expect(authRedirect(route('/privacy', undefined, {}, true), false)).toBe(true);
    expect(authRedirect(route('/privacy', undefined, {}, true), true)).toBe(true);
    expect(authRedirect(route('/privacy', undefined, { redirect: '/bin' }, true), true)).toBe(true);
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
