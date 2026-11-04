import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { pwaManifest } from '../../pwa-manifest';

const root = resolve(__dirname, '../..');
const readJson = (path: string) => JSON.parse(readFileSync(resolve(root, path), 'utf8'));

const FINGERPRINT = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/;

interface AssetLinkStatement {
  relation: string[];
  target: { namespace: string; package_name: string; sha256_cert_fingerprints: string[] };
}

// Returns the fingerprints that are not 32 colon-separated uppercase hex pairs.
const badFingerprints = (links: AssetLinkStatement[]) =>
  links.flatMap((l) => l.target.sha256_cert_fingerprints).filter((f) => !FINGERPRINT.test(f));

const assetLinks: AssetLinkStatement[] = readJson('public/.well-known/assetlinks.json');
const twa = readJson('android/twa-manifest.json');

const withFingerprint = (f: string): AssetLinkStatement[] => [
  { ...assetLinks[0], target: { ...assetLinks[0].target, sha256_cert_fingerprints: [f] } },
];

describe('asset links', () => {
  it('holds one handle_all_urls statement for the TWA package', () => {
    expect(assetLinks).toHaveLength(1);
    expect(assetLinks[0].relation).toEqual(['delegate_permission/common.handle_all_urls']);
    expect(assetLinks[0].target.namespace).toBe('android_app');
    expect(assetLinks[0].target.package_name).toBe(twa.packageId);
    expect(twa.packageId).toBe('in.spanion.flashcards.twa');
  });

  it('has only well-formed fingerprints (an empty list passes)', () => {
    expect(badFingerprints(assetLinks)).toEqual([]);
  });

  it('rejects a malformed fingerprint and accepts a 32-pair uppercase one', () => {
    expect(badFingerprints(withFingerprint('AB:CD'))).toEqual(['AB:CD']);
    expect(badFingerprints(withFingerprint(Array(32).fill('aB').join(':')))).toHaveLength(1);
    expect(badFingerprints(withFingerprint(Array(32).fill('AB').join(':')))).toEqual([]);
  });
});

describe('twa-manifest.json', () => {
  it('uses the production host', () => {
    expect(twa.host).toBe('flashcards.spanion.in');
  });

  it('matches the web manifest', () => {
    expect(twa.display).toBe(pwaManifest.display);
    expect(twa.themeColor).toBe(pwaManifest.theme_color);
    expect(twa.backgroundColor).toBe(pwaManifest.background_color);
    expect(twa.themeColor).toBe('#E91E63');
    expect(twa.backgroundColor).toBe('#ECECEC');
    expect(twa.display).toBe('standalone');
  });

  it('fixes orientation, fallback and notifications', () => {
    expect(twa.orientation).toBe('portrait');
    expect(twa.fallbackType).toBe('customtabs');
    expect(twa.enableNotifications).toBe(false);
  });

  it('points icons at the production site, not a local server', () => {
    expect(twa.iconUrl).toBe('https://flashcards.spanion.in/img/icons/android-chrome-512x512.png');
    expect(twa.maskableIconUrl).toBe('https://flashcards.spanion.in/img/icons/maskable-512x512.png');
    expect(twa.webManifestUrl).toBe('https://flashcards.spanion.in/manifest.webmanifest');
  });

  it('versions the app like package.json', () => {
    expect(twa.appVersionName).toBe(readJson('package.json').version);
  });
});

describe('android/app/build.gradle', () => {
  const gradle = readFileSync(resolve(root, 'android/app/build.gradle'), 'utf8');
  const sdk = (key: string) => Number(new RegExp(`${key}\\s+(\\d+)`).exec(gradle)?.[1]);

  it('targets API 36 or later', () => {
    expect(sdk('targetSdkVersion')).toBeGreaterThanOrEqual(36);
    expect(sdk('compileSdkVersion')).toBeGreaterThanOrEqual(36);
  });
});

describe('git ignore', () => {
  it.each(['android/app/build/', 'android/local.properties', 'x.jks'])('ignores %s', (path) => {
    const out = execFileSync('git', ['check-ignore', path], { cwd: root }).toString().trim();
    expect(out).toBe(path);
  });
});
