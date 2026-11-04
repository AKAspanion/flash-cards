import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BOOT_SPLASH_ID, BOOT_SPLASH_REMOVE_MS, hideBootSplash } from '@/utils/bootSplash';

const html = readFileSync(resolve(__dirname, '../../index.html'), 'utf8');
const mainSource = readFileSync(resolve(__dirname, '../../src/main.ts'), 'utf8');

function docWithSplash(): Document {
  const doc = document.implementation.createHTMLDocument('t');
  const el = doc.createElement('div');
  el.id = BOOT_SPLASH_ID;
  doc.body.appendChild(el);
  return doc;
}

describe('hideBootSplash', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('blocks pointer events at once and removes the overlay on transitionend', () => {
    const doc = docWithSplash();
    const el = doc.getElementById(BOOT_SPLASH_ID)!;
    hideBootSplash(doc);
    expect(el.style.pointerEvents).toBe('none');
    expect(el.classList.contains('boot-splash--hiding')).toBe(true);
    expect(doc.getElementById(BOOT_SPLASH_ID)).not.toBeNull();
    el.dispatchEvent(new Event('transitionend'));
    expect(doc.getElementById(BOOT_SPLASH_ID)).toBeNull();
  });

  it('removes the overlay after 400 ms when no transitionend arrives', () => {
    const doc = docWithSplash();
    hideBootSplash(doc);
    vi.advanceTimersByTime(BOOT_SPLASH_REMOVE_MS - 1);
    expect(doc.getElementById(BOOT_SPLASH_ID)).not.toBeNull();
    vi.advanceTimersByTime(1);
    expect(doc.getElementById(BOOT_SPLASH_ID)).toBeNull();
  });

  it('does nothing the second time, before or after removal, and sets no second timer', () => {
    const doc = docWithSplash();
    hideBootSplash(doc);
    expect(vi.getTimerCount()).toBe(1);
    expect(() => hideBootSplash(doc)).not.toThrow();
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(BOOT_SPLASH_REMOVE_MS);
    expect(() => hideBootSplash(doc)).not.toThrow();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does nothing without an overlay', () => {
    const doc = document.implementation.createHTMLDocument('t');
    expect(() => hideBootSplash(doc)).not.toThrow();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('index.html', () => {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  it('has #boot-splash beside #app, hidden from assistive tech, holding the splash image', () => {
    const splash = doc.getElementById('boot-splash')!;
    expect(splash).not.toBeNull();
    expect(splash.parentElement).toBe(doc.body);
    expect(doc.getElementById('app')!.contains(splash)).toBe(false);
    expect(splash.getAttribute('aria-hidden')).toBe('true');
    expect(splash.querySelector('img')!.getAttribute('src')).toBe('/img/splash.png');
  });

  it('no longer has the boot logo inside #app', () => {
    expect(doc.querySelector('#app .boot-logo')).toBeNull();
    expect(html).not.toContain('boot-logo');
  });

  it('hides the overlay under noscript', () => {
    expect(html).toMatch(/<noscript>[\s\S]*#boot-splash\s*\{\s*display:\s*none/);
  });

  it('styles the overlay on #ECECEC at 300px and fades with a 300ms opacity transition', () => {
    expect(html).toMatch(/#boot-splash\s*\{[^}]*background:\s*#ECECEC/i);
    expect(html).toMatch(/width:\s*300px/);
    expect(html).toMatch(/height:\s*300px/);
    expect(html).toMatch(/\.boot-splash--hiding\s*\{[^}]*opacity:\s*0/);
    expect(html).toMatch(/transition:\s*opacity\s+300ms/);
  });
});

describe('src/main.ts', () => {
  it('hides the splash when router.isReady() settles, not only on success', () => {
    expect(mainSource).toMatch(/router\.isReady\(\)[\s\S]*\.finally\(/);
    expect(mainSource).toContain('hideBootSplash');
    expect(mainSource).toContain('requestAnimationFrame');
  });
});
