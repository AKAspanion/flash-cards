import { describe, expect, it } from 'vitest';
import { createI18n } from 'vue-i18n';
import { relativeTime } from '@/utils/relativeTime';
import en from '@/locales/en.json';
import hi from '@/locales/hi.json';

const now = new Date('2026-11-02T12:00:00');
const ago = (ms: number) => new Date(now.getTime() - ms);
const SEC = 1000;
const DAY = 86400 * SEC;

describe('relativeTime', () => {
  it('picks the largest unit that fits, in English', () => {
    expect(relativeTime(ago(3 * DAY), now, 'en')).toBe('3 days ago');
    expect(relativeTime(ago(DAY), now, 'en')).toBe('yesterday');
    expect(relativeTime(ago(30 * SEC), now, 'en')).toBe('30 seconds ago');
    expect(relativeTime(ago(2 * 3600 * SEC), now, 'en')).toBe('2 hours ago');
    expect(relativeTime(ago(5 * 60 * SEC), now, 'en')).toBe('5 minutes ago');
    expect(relativeTime(ago(45 * DAY), now, 'en')).toBe('last month');
    expect(relativeTime(ago(400 * DAY), now, 'en')).toBe('last year');
  });

  it('formats in Hindi with Intl', () => {
    const expected = new Intl.RelativeTimeFormat('hi', { numeric: 'auto' }).format(-3, 'day');
    expect(relativeTime(ago(3 * DAY), now, 'hi')).toBe(expected);
  });

  it('treats a future date as now', () => {
    expect(relativeTime(new Date(now.getTime() + 5 * DAY), now, 'en')).toBe('now');
  });
});

describe('home.set copy', () => {
  const i18n = createI18n({ legacy: false, locale: 'en', fallbackLocale: 'en', messages: { en, hi } });
  const t = i18n.global.t;
  it('pluralises matches', () => {
    expect(t('home.set.matches', { n: 1 }, 1)).toBe('Matches in 1 card');
    expect(t('home.set.matches', { n: 4 }, 4)).toBe('Matches in 4 cards');
  });
  it('has the studied lines', () => {
    expect(t('home.set.studied', { time: '3 days ago' })).toBe('Studied 3 days ago');
    expect(t('home.set.not-studied')).toBe('Not studied yet');
  });
});
