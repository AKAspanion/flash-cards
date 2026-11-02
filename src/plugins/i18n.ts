import { createI18n } from 'vue-i18n';
import en from '@/locales/en.json';
import hi from '@/locales/hi.json';

export type MessageSchema = typeof en;

const i18n = createI18n<[MessageSchema], 'en' | 'hi'>({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: { en, hi },
});

export default i18n;
