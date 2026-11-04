import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import en from '@/locales/en.json';
import hi from '@/locales/hi.json';
import { pwaManifest } from '../../pwa-manifest';

const root = resolve(__dirname, '../..');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const doc = new DOMParser().parseFromString(html, 'text/html');

function values(messages: unknown): string[] {
  return typeof messages === 'string'
    ? [messages]
    : Object.values(messages as Record<string, unknown>).flatMap(values);
}

function keys(messages: unknown, prefix = ''): string[] {
  return Object.entries(messages as Record<string, unknown>).flatMap(([key, value]) =>
    typeof value === 'string' ? [prefix + key] : keys(value, `${prefix}${key}.`),
  );
}

// The early-paint script is an external file in public/, loaded before the module in <head>.
function headScript(): string {
  const tag = doc.head.querySelector('script[src]:not([type="module"])');
  expect(tag, 'a classic head script').not.toBeNull();
  return readFileSync(resolve(root, 'public', tag!.getAttribute('src')!.replace(/^\//, '')), 'utf8');
}

describe('app name', () => {
  it('names the manifest FlashCards', () => {
    expect(pwaManifest.name).toBe('FlashCards - Learn & Memorize');
    expect(pwaManifest.short_name).toBe('FlashCards');
  });

  it('never writes Flashcards in English strings', () => {
    expect(values(en).filter((v) => v.includes('Flashcards'))).toEqual([]);
  });

  it('keeps the English and Hindi keys the same', () => {
    expect(keys(hi).sort()).toEqual(keys(en).sort());
  });

  it('has the new deletion and account keys', () => {
    expect(en.account.delete.row).toBe('Remove your account and everything in it');
    expect(en.deletion.what.title).toBe("What's deleted");
    expect(en.deletion.app.title).toBe('In the app');
  });
});

describe('index.html', () => {
  it('uses FlashCards in the title, description and noscript', () => {
    expect(doc.title).toBe('FlashCards');
    expect(doc.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(
      'FlashCards: a learning and memorization helper app.',
    );
    expect(doc.querySelector('noscript')?.textContent).toContain(
      'FlashCards needs JavaScript to work. Please enable it to continue.',
    );
  });

  it('paints the light background in CSS and loads the head script before the module', () => {
    expect(html).toMatch(/html,\s*body\s*\{[^}]*background:\s*#ECECEC/i);
    const scripts = [...doc.querySelectorAll('script')];
    const classic = scripts.findIndex((s) => s.getAttribute('src') && s.type !== 'module');
    const module = scripts.findIndex((s) => s.type === 'module');
    expect(classic).toBeGreaterThanOrEqual(0);
    expect(classic).toBeLessThan(module);
  });
});

describe('early paint script', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('style');
  });

  const run = () => new Function(headScript())();
  const bg = () => document.documentElement.style.background;

  it('paints dark when dark is saved', () => {
    localStorage.setItem('dark', 'true');
    run();
    expect(bg()).toBe('rgb(18, 18, 18)');
  });

  it('paints light with nothing saved', () => {
    run();
    expect(bg()).toBe('rgb(236, 236, 236)');
  });

  it('paints light for an unexpected saved value', () => {
    localStorage.setItem('dark', '{not json');
    expect(run).not.toThrow();
    expect(bg()).toBe('rgb(236, 236, 236)');
  });

  it('does not throw when storage is unavailable', () => {
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = () => {
      throw new Error('blocked');
    };
    try {
      expect(run).not.toThrow();
    } finally {
      Storage.prototype.getItem = original;
    }
  });
});
