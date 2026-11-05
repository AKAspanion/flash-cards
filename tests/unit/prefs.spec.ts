import { beforeEach, describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { usePrefsStore } from '@/stores/prefs';

describe('prefs store', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it('accepts the new orders and rejects unknown ones', () => {
    localStorage.setItem('card-set-order', 'Recently studied');
    expect(usePrefsStore().setOrder).toBe('Recently studied');
    setActivePinia(createPinia());
    localStorage.setItem('card-set-order', 'Bogus');
    expect(usePrefsStore().setOrder).toBe('Alphabetically');
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

  it('defaults the study toggles to off', () => {
    const prefs = usePrefsStore();
    expect([prefs.studyShuffle, prefs.studyUnlearnedOnly, prefs.studyReverse]).toEqual([false, false, false]);
  });

  it('reads and persists the study toggles', async () => {
    localStorage.setItem('study-shuffle', 'true');
    const prefs = usePrefsStore();
    expect(prefs.studyShuffle).toBe(true);
    prefs.studyReverse = true;
    prefs.studyUnlearnedOnly = true;
    await nextTick();
    expect(localStorage.getItem('study-reverse')).toBe('true');
    expect(localStorage.getItem('study-unlearned-only')).toBe('true');
  });
});
