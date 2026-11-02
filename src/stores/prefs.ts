import { ref, watch, type Ref } from 'vue';
import { defineStore } from 'pinia';
import type { SetOrder } from '@/types';
import { isSetOrder } from '@/utils/cardSets';

// Storage keys are the ones the original app used, so saved settings carry over.
const KEYS = {
  lang: 'lang',
  dark: 'dark',
  favOnTop: 'fav-on-top',
  setOrder: 'card-set-order',
} as const;

export type Lang = 'en' | 'hi';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function persist<T>(source: Ref<T>, key: string, serialize: (value: T) => string) {
  watch(source, (value) => {
    try {
      localStorage.setItem(key, serialize(value));
    } catch {
      // Storage unavailable (private mode): the setting just won't persist.
    }
  });
}

export const usePrefsStore = defineStore('prefs', () => {
  const lang = ref<Lang>(read(KEYS.lang) === 'hi' ? 'hi' : 'en');
  const dark = ref(read(KEYS.dark) === 'true');
  const favOnTop = ref(read(KEYS.favOnTop) === 'true');
  const storedOrder = read(KEYS.setOrder);
  const setOrder = ref<SetOrder>(isSetOrder(storedOrder) ? storedOrder : 'Alphabetically');

  persist(lang, KEYS.lang, String);
  persist(dark, KEYS.dark, String);
  persist(favOnTop, KEYS.favOnTop, String);
  persist(setOrder, KEYS.setOrder, String);

  return { lang, dark, favOnTop, setOrder };
});
