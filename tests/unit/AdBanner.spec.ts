import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, nextTick, type App } from 'vue';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import vuetify from '@/plugins/vuetify';

const ads = vi.hoisted(() => ({
  adsConfig: vi.fn(),
  loadAdSense: vi.fn(),
  requestAd: vi.fn(),
}));
vi.mock('@/services/ads', () => ads);

import AdBanner from '@/components/AdBanner.vue';

const CONFIG = { client: 'ca-pub-1234567890', slot: '9876543210' };
let host: HTMLElement | null = null;
let app: App | null = null;

function mount() {
  host = document.createElement('div');
  document.body.appendChild(host);
  app = createApp(AdBanner).use(vuetify);
  app.mount(host);
  return host;
}

beforeEach(() => {
  ads.adsConfig.mockReset();
  ads.loadAdSense.mockReset();
  ads.requestAd.mockReset();
});

afterEach(() => {
  app?.unmount();
  host?.remove();
  app = null;
  host = null;
});

describe('AdBanner', () => {
  it('renders nothing and loads nothing without a config', async () => {
    ads.adsConfig.mockReturnValue(null);
    const el = mount();
    await nextTick();
    expect(el.querySelector('ins')).toBeNull();
    expect(ads.loadAdSense).not.toHaveBeenCalled();
    expect(ads.requestAd).not.toHaveBeenCalled();
  });

  it('renders one ad slot with the client and slot, and asks for the ad once', async () => {
    ads.adsConfig.mockReturnValue(CONFIG);
    const el = mount();
    await nextTick();
    const ins = el.querySelectorAll('ins.adsbygoogle');
    expect(ins).toHaveLength(1);
    expect(ins[0].getAttribute('data-ad-client')).toBe('ca-pub-1234567890');
    expect(ins[0].getAttribute('data-ad-slot')).toBe('9876543210');
    expect(ins[0].getAttribute('data-ad-format')).toBe('auto');
    expect(ins[0].getAttribute('data-full-width-responsive')).toBe('true');
    expect((ins[0] as HTMLElement).style.display).toBe('block');
    expect(ads.loadAdSense).toHaveBeenCalledTimes(1);
    expect(ads.loadAdSense).toHaveBeenCalledWith('ca-pub-1234567890');
    expect(ads.requestAd).toHaveBeenCalledTimes(1);
  });

  it('asks for a new ad each time it is mounted', async () => {
    ads.adsConfig.mockReturnValue(CONFIG);
    const first = mount();
    await nextTick();
    const firstIns = first.querySelector('ins');
    app!.unmount();
    host!.remove();
    const second = mount();
    await nextTick();
    expect(ads.requestAd).toHaveBeenCalledTimes(2);
    expect(second.querySelector('ins')).not.toBeNull();
    expect(second.querySelector('ins')).not.toBe(firstIns);
  });

  it('does not break the page when the ad request throws', async () => {
    ads.adsConfig.mockReturnValue(CONFIG);
    ads.requestAd.mockImplementation(() => {
      throw new Error('blocked');
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    let el: HTMLElement | undefined;
    expect(() => {
      el = mount();
    }).not.toThrow();
    await nextTick();
    expect(el!.querySelector('ins')).not.toBeNull();
    warn.mockRestore();
  });

  it('hides an unfilled slot with a style rule', () => {
    const src = readFileSync(resolve(__dirname, '../../src/components/AdBanner.vue'), 'utf8');
    expect(src).toMatch(/ins\.adsbygoogle\[data-ad-status=['"]unfilled['"]\]\s*\{[^}]*display:\s*none/);
  });
});

describe('where the banner is placed', () => {
  const views = resolve(__dirname, '../../src/views');
  const read = (name: string) => readFileSync(resolve(views, name), 'utf8');

  it('is on Home after the sets list, only once sets have loaded, outside the transition-group', () => {
    const src = read('Home.vue');
    const tpl = src.slice(0, src.indexOf('<script'));
    const banner = tpl.indexOf('<ad-banner');
    expect(banner).toBeGreaterThan(tpl.indexOf('</transition-group>'));
    expect(banner).toBeLessThan(tpl.indexOf('<option-panel'));
    const tag = tpl.slice(banner, tpl.indexOf('/>', banner));
    expect(tag).toMatch(/v-if="library\.status !== 'idle' && library\.status !== 'loading'"/);
  });

  it('is the last element on Info, after the last v-card', () => {
    const src = read('Info.vue');
    const tpl = src.slice(0, src.indexOf('<script'));
    const banner = tpl.indexOf('<ad-banner');
    expect(banner).toBeGreaterThan(tpl.lastIndexOf('</v-card>'));
    expect(tpl.slice(banner).replace(/<ad-banner\s*\/>/, '').replace(/\s+/g, '')).toBe('</div></template>');
  });

  it('is used by no other view', () => {
    const using = readdirSync(views)
      .filter((f) => f.endsWith('.vue'))
      .filter((f) => /ad-banner|AdBanner/.test(read(f)))
      .sort();
    expect(using).toEqual(['Home.vue', 'Info.vue']);
  });
});
