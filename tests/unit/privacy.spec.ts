import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp, nextTick } from 'vue';
import { createI18n } from 'vue-i18n';
import vuetify from '@/plugins/vuetify';
import en from '@/locales/en.json';
import hi from '@/locales/hi.json';

vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/stores/session', () => ({ useSessionStore: () => ({ user: null }) }));
vi.mock('@/components/BarTop.vue', () => ({ default: { template: '<div />' } }));

const ADS_BODY =
  'FlashCards shows ads from Google AdSense at the bottom of some screens, never while you study. ' +
  'Third-party vendors, including Google, use cookies to serve ads based on your prior visits to this app and other websites. ' +
  "Google's use of advertising cookies lets it and its partners serve ads to you based on those visits. " +
  'Each ad request sends Google your IP address and information about your browser and device. ' +
  'If you are in the EEA, the UK or Switzerland, you are asked for your consent first. ' +
  "You can turn off personalised ads at adssettings.google.com, opt out of other vendors' cookies for personalised ads at " +
  'www.aboutads.info, and read how Google uses this data at policies.google.com/technologies/partner-sites.';

let Privacy: typeof import('@/views/Privacy.vue').default;
let host: HTMLElement | null = null;

beforeAll(async () => {
  Privacy = (await import('@/views/Privacy.vue')).default;
});

afterEach(() => {
  host?.remove();
  host = null;
});

async function render(locale: 'en' | 'hi') {
  const i18n = createI18n({ legacy: false, locale, fallbackLocale: 'en', messages: { en, hi } });
  host = document.createElement('div');
  document.body.appendChild(host);
  createApp(Privacy)
    .use(i18n)
    .use(vuetify)
    .component('RouterLink', { props: ['to'], template: '<a><slot /></a>' })
    .mount(host);
  await nextTick();
  return Array.from(host.querySelectorAll<HTMLElement>('.legal__row'));
}

const text = (el: Element) => el.textContent?.replace(/\s+/g, ' ').trim();

describe('Privacy view', () => {
  it('says how data is used without claiming there are no ads', async () => {
    const rows = await render('en');
    expect(text(rows[1])).toContain(
      "To sign you in, to show and save your sets, and to show ads (see Ads). We don't use analytics, and we don't sell your data.",
    );
    expect(JSON.stringify(en)).not.toContain("We don't show ads");
  });

  it('puts an Ads row right after How it is used, with the spec wording', async () => {
    const rows = await render('en');
    const ads = rows[2];
    expect(ads.querySelector('.mdi-bullhorn-outline')).not.toBeNull();
    expect(ads.querySelector('.text-title-small')?.textContent?.trim()).toBe('Ads');
    expect(text(ads.querySelector('p')!)).toBe(ADS_BODY);
  });

  it('links the three ad-choice addresses in a new tab', async () => {
    const rows = await render('en');
    const links = Array.from(rows[2].querySelectorAll('a'));
    expect(links.map((a) => [a.getAttribute('href'), a.textContent])).toEqual([
      ['https://adssettings.google.com', 'adssettings.google.com'],
      ['https://www.aboutads.info/choices/', 'www.aboutads.info'],
      ['https://policies.google.com/technologies/partner-sites', 'policies.google.com/technologies/partner-sites'],
    ]);
    for (const a of links) {
      expect(a.getAttribute('target')).toBe('_blank');
      expect(a.getAttribute('rel')).toBe('noopener noreferrer');
    }
  });

  it('shows the Ads row and links in Hindi, without the no-ads claim', async () => {
    const rows = await render('hi');
    const ads = rows[2];
    expect(ads.querySelector('.mdi-bullhorn-outline')).not.toBeNull();
    expect(text(ads)).toContain(hi.privacy.ads.title);
    expect(ads.querySelectorAll('a')).toHaveLength(3);
    const body = text(ads.querySelector('p')!)!;
    for (const link of ['adssettings.google.com', 'www.aboutads.info', 'policies.google.com/technologies/partner-sites']) {
      expect(body).toContain(link);
    }
    expect(body).not.toContain('{');
    expect(hi.privacy.use.body).not.toContain('विज्ञापन नहीं दिखाते');
  });

  it('dates the policy with the build date', () => {
    expect(en.privacy.updated).toMatch(/^Last updated: \d{1,2} [A-Z][a-z]+ 2026$/);
    expect(en.privacy.updated).toBe('Last updated: 6 November 2026');
  });
});
