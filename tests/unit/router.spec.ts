import { describe, expect, it } from 'vitest';
import { authRedirect, safeRedirect } from '@/router';

const route = (fullPath: string, requireAuth?: boolean, query: Record<string, unknown> = {}) => ({
  fullPath,
  meta: { requireAuth },
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

describe('safeRedirect', () => {
  it('only accepts in-app paths', () => {
    expect(safeRedirect('/abc/view')).toBe('/abc/view');
    expect(safeRedirect('//evil.example')).toBe('/home');
    expect(safeRedirect('https://evil.example')).toBe('/home');
    expect(safeRedirect(['/a'])).toBe('/home');
    expect(safeRedirect(undefined)).toBe('/home');
  });
});
