import { ref, watch, type Ref } from 'vue';
import { defineStore } from 'pinia';
import { setAuthLanguage } from '@/services/firebase';
import type { SetOrder } from '@/types';
import { isSetOrder } from '@/utils/cardSets';
import { DEFAULT_REMINDER_TIME, isReminderTime } from '@/utils/ics';

// Storage keys are the ones the original app used, so saved settings carry over.
const KEYS = {
  lang: 'lang',
  dark: 'dark',
  favOnTop: 'fav-on-top',
  setOrder: 'card-set-order',
  studyShuffle: 'study-shuffle',
  studyUnlearnedOnly: 'study-unlearned-only',
  studyReverse: 'study-reverse',
  reminderTime: 'reminder-time',
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
  const studyShuffle = ref(read(KEYS.studyShuffle) === 'true');
  const studyUnlearnedOnly = ref(read(KEYS.studyUnlearnedOnly) === 'true');
  const studyReverse = ref(read(KEYS.studyReverse) === 'true');
  const storedReminder = read(KEYS.reminderTime);
  const reminderTime = ref(isReminderTime(storedReminder) ? storedReminder : DEFAULT_REMINDER_TIME);

  // Firebase Auth sends its emails (verification, password reset) and shows its pages in the app's language.
  watch(
    lang,
    (value) => {
      try {
        setAuthLanguage(value);
      } catch (err) {
        // Firebase not configured: the router shows that error; the store, and the app, still load.
        console.error('Auth language not set:', (err as Error)?.name);
      }
    },
    { immediate: true },
  );

  persist(lang, KEYS.lang, String);
  persist(dark, KEYS.dark, String);
  persist(favOnTop, KEYS.favOnTop, String);
  persist(setOrder, KEYS.setOrder, String);
  persist(studyShuffle, KEYS.studyShuffle, String);
  persist(studyUnlearnedOnly, KEYS.studyUnlearnedOnly, String);
  persist(studyReverse, KEYS.studyReverse, String);
  persist(reminderTime, KEYS.reminderTime, String);

  return { lang, dark, favOnTop, setOrder, studyShuffle, studyUnlearnedOnly, studyReverse, reminderTime };
});
