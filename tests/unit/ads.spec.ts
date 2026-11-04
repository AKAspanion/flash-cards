import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const importAds = async () => {
  vi.resetModules();
  return import('@/services/ads');
};

const scripts = () => Array.from(document.head.querySelectorAll('script'));

beforeEach(() => {
  document.head.innerHTML = '';
  delete window.adsbygoogle;
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('adsConfig', () => {
  it('returns the client and slot when both are valid', async () => {
    vi.stubEnv('VUE_APP_ADSENSE_CLIENT', 'ca-pub-1234567890');
    vi.stubEnv('VUE_APP_ADSENSE_SLOT', '9876543210');
    const { adsConfig } = await importAds();
    expect(adsConfig()).toEqual({ client: 'ca-pub-1234567890', slot: '9876543210' });
  });

  it('returns null when either var is empty or unset', async () => {
    const { adsConfig } = await importAds();
    vi.stubEnv('VUE_APP_ADSENSE_CLIENT', '');
    vi.stubEnv('VUE_APP_ADSENSE_SLOT', '');
    expect(adsConfig()).toBeNull();
    vi.stubEnv('VUE_APP_ADSENSE_CLIENT', 'ca-pub-1234567890');
    expect(adsConfig()).toBeNull();
    vi.stubEnv('VUE_APP_ADSENSE_CLIENT', '');
    vi.stubEnv('VUE_APP_ADSENSE_SLOT', '9876543210');
    expect(adsConfig()).toBeNull();
  });

  it.each(['ca-pub-123"><script>', 'pub-1234567890', ' ca-pub-1234567890', 'ca-pub-', 'ca-pub-12\n'])(
    'returns null for the client %j',
    async (client) => {
      vi.stubEnv('VUE_APP_ADSENSE_CLIENT', client);
      vi.stubEnv('VUE_APP_ADSENSE_SLOT', '9876543210');
      const { adsConfig } = await importAds();
      expect(adsConfig()).toBeNull();
    },
  );

  it.each(['12a34', '1234 ', '12\n'])('returns null for the slot %j', async (slot) => {
    vi.stubEnv('VUE_APP_ADSENSE_CLIENT', 'ca-pub-1234567890');
    vi.stubEnv('VUE_APP_ADSENSE_SLOT', slot);
    const { adsConfig } = await importAds();
    expect(adsConfig()).toBeNull();
  });
});

describe('loadAdSense', () => {
  it('appends one async anonymous script however often it is called', async () => {
    const { loadAdSense, ADSENSE_SCRIPT_URL } = await importAds();
    loadAdSense('ca-pub-1234567890');
    loadAdSense('ca-pub-1234567890');
    loadAdSense('ca-pub-1234567890');
    expect(scripts()).toHaveLength(1);
    const s = scripts()[0];
    expect(s.src).toBe('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1234567890');
    expect(ADSENSE_SCRIPT_URL).toBe('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js');
    expect(s.async).toBe(true);
    expect(s.crossOrigin).toBe('anonymous');
  });

  it('appends nothing for a malformed client', async () => {
    const { loadAdSense } = await importAds();
    loadAdSense('x&evil=1');
    expect(scripts()).toHaveLength(0);
  });

  it('swallows a script error event', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { loadAdSense } = await importAds();
    loadAdSense('ca-pub-1234567890');
    expect(() => scripts()[0].dispatchEvent(new Event('error'))).not.toThrow();
    expect(errSpy).not.toHaveBeenCalled();
  });
});

describe('requestAd', () => {
  it('creates window.adsbygoogle holding one empty object', async () => {
    const { requestAd } = await importAds();
    requestAd();
    expect(window.adsbygoogle).toEqual([{}]);
  });

  it('does not throw when push throws', async () => {
    const { requestAd } = await importAds();
    window.adsbygoogle = {
      push: () => {
        throw new Error('blocked');
      },
    } as unknown as unknown[];
    expect(() => requestAd()).not.toThrow();
  });
});

describe('env wiring', () => {
  it('lists both vars under the comment in .env.example', () => {
    const text = readFileSync('.env.example', 'utf8');
    expect(text).toContain('# Optional: Google AdSense banner; no ads when empty');
    expect(text).toMatch(/^VUE_APP_ADSENSE_CLIENT=$/m);
    expect(text).toMatch(/^VUE_APP_ADSENSE_SLOT=$/m);
  });

  it('passes both vars from vars in deploy.yml but does not require them', () => {
    const text = readFileSync('.github/workflows/deploy.yml', 'utf8');
    expect(text).toContain('VUE_APP_ADSENSE_CLIENT: ${{ vars.VUE_APP_ADSENSE_CLIENT }}');
    expect(text).toContain('VUE_APP_ADSENSE_SLOT: ${{ vars.VUE_APP_ADSENSE_SLOT }}');
    const loop = text.split('\n').find((l) => l.includes('for v in'))!;
    expect(loop).not.toContain('ADSENSE');
  });
});
