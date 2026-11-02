import { beforeEach, describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { usePrefsStore } from '@/stores/prefs';

describe('prefs store', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it('reads settings saved by the original app', () => {
    localStorage.setItem('lang', 'hi');
    localStorage.setItem('dark', 'true');
    localStorage.setItem('fav-on-top', 'true');
    localStorage.setItem('card-set-order', 'Old first');
    const prefs = usePrefsStore();
    expect([prefs.lang, prefs.dark, prefs.favOnTop, prefs.setOrder]).toEqual(['hi', true, true, 'Old first']);
  });

  it('falls back to defaults for missing or invalid values', () => {
    localStorage.setItem('card-set-order', 'Sideways');
    const prefs = usePrefsStore();
    expect([prefs.lang, prefs.dark, prefs.favOnTop, prefs.setOrder]).toEqual(['en', false, false, 'Alphabetically']);
  });

  it('persists changes', async () => {
    const prefs = usePrefsStore();
    prefs.dark = true;
    prefs.setOrder = 'New first';
    await nextTick();
    expect(localStorage.getItem('dark')).toBe('true');
    expect(localStorage.getItem('card-set-order')).toBe('New first');
  });
});
