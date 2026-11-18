import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp, nextTick } from 'vue';
import { createI18n } from 'vue-i18n';
import vuetify from '@/plugins/vuetify';
import en from '@/locales/en.json';
import hi from '@/locales/hi.json';
import { CONTACT_EMAIL } from '@/utils/contact';

vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/stores/session', () => ({ useSessionStore: () => ({ user: null }) }));
vi.mock('@/components/BarTop.vue', () => ({ default: { template: '<div />' } }));

const EN_TEXT = [
  'Terms of service',
  'Last updated: 17 November 2026',
  'FlashCards is made by Ankit Kumar Pandit. By using it, you agree to these terms.',
  'Who can use it',
  'You must be 13 or older to use FlashCards. Keep your sign-in details safe; you are responsible for what happens in your account.',
  'Your sets',
  'The sets, cards and labels you make are yours. We store them only to run the app for you, as the Privacy policy explains.',
  'Sharing',
  'When you share a set, anyone with its link can view it and add a copy to their own library, until you stop sharing. Copies already added stay with the people who added them.',
  "What's not allowed",
  "Only put on your cards what you have the right to use. Don't use FlashCards for anything unlawful or abusive, or that infringes someone else's rights.",
  'If the terms are broken',
  'We may remove shared content, or close an account, that breaks these terms.',
  'No warranty',
  'FlashCards is free and provided "as is", without warranties of any kind. As far as the law allows, we are not liable for any loss or damage from using it.',
  'Governing law',
  'These terms are governed by the laws of India.',
  'Contact',
  `Ankit Kumar Pandit, ${CONTACT_EMAIL}`,
  'If these terms change, the date above changes with it.',
];

const EN_ROW_TITLES = [
  'Who can use it',
  'Your sets',
  'Sharing',
  "What's not allowed",
  'If the terms are broken',
  'No warranty',
  'Governing law',
  'Contact',
];

const ICONS = [
  'mdi-account-check-outline',
  'mdi-cards-outline',
  'mdi-share-variant-outline',
  'mdi-cancel',
  'mdi-account-cancel-outline',
  'mdi-alert-circle-outline',
  'mdi-scale-balance',
  'mdi-email-outline',
];

const ROW_KEYS = ['who', 'yours', 'sharing', 'rules', 'enforce', 'warranty', 'law', 'contact'] as const;

let Terms: typeof import('@/views/Terms.vue').default;
let host: HTMLElement | null = null;

beforeAll(async () => {
  Terms = (await import('@/views/Terms.vue')).default;
});

afterEach(() => {
  host?.remove();
  host = null;
});

async function render(locale: 'en' | 'hi') {
  const i18n = createI18n({ legacy: false, locale, fallbackLocale: 'en', messages: { en, hi } });
  host = document.createElement('div');
  document.body.appendChild(host);
  createApp(Terms)
    .use(i18n)
    .use(vuetify)
    .component('RouterLink', { props: ['to'], template: '<a :href="to"><slot /></a>' })
    .mount(host);
  await nextTick();
  return host;
}

const text = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, ' ').trim();

describe('Terms view', () => {
  it('shows every English string', async () => {
    const page = text(await render('en'));
    for (const line of EN_TEXT) {
      expect(page).toContain(line);
    }
  });

  it('gives each row its title and icon, in order', async () => {
    const rows = Array.from((await render('en')).querySelectorAll('.legal__row'));
    expect(rows.map((row) => text(row.querySelector('.text-title-small')))).toEqual(EN_ROW_TITLES);
    rows.forEach((row, i) => expect(row.querySelector(`.${ICONS[i]}`)).not.toBeNull());
  });

  it('links the contact address as a mailto link', async () => {
    const page = await render('en');
    const mail = page.querySelector<HTMLAnchorElement>(`a[href="mailto:${CONTACT_EMAIL}"]`);
    expect(mail?.textContent).toBe(CONTACT_EMAIL);
  });

  it('links the privacy policy inside the Your sets sentence', async () => {
    const rows = (await render('en')).querySelectorAll('.legal__row');
    const link = rows[1].querySelector('p a');
    expect(link?.getAttribute('href')).toBe('/privacy');
    expect(text(link)).toBe('Privacy policy');
    expect(text(rows[1].querySelector('p'))).toBe(en.terms.yours.body);
  });

  it('shows the Hindi title, row titles and the in-sentence privacy link, with no English row title left', async () => {
    const page = await render('hi');
    const all = text(page)!;
    expect(all).toContain(hi.terms.title);
    for (const key of ROW_KEYS) {
      expect(all).toContain(hi.terms[key].title);
    }
    for (const title of EN_ROW_TITLES) {
      expect(all).not.toContain(title);
    }
    const yours = page.querySelectorAll('.legal__row')[1];
    const link = yours.querySelector('p a');
    expect(link?.getAttribute('href')).toBe('/privacy');
    expect(text(link)).toBe(hi.links.privacy);
    expect(text(yours.querySelector('p'))).toBe(hi.terms.yours.body);
  });

  it('dates the terms', () => {
    expect(en.terms.updated).toMatch(/^Last updated: \d{1,2} [A-Z][a-z]+ 2026$/);
    expect(en.terms.updated).toBe('Last updated: 17 November 2026');
  });
});
