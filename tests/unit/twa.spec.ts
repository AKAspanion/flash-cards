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

  // The upload key signs builds we install by hand; Play re-signs store installs with its own key. Android 17 phones
  // check a hybrid signer (RSA + ML-DSA) that Play adds alongside it, so all three of Play's certificates are listed.
  it('lists the upload key and every Play app-signing certificate, but not the source stamp', () => {
    const listed = assetLinks[0].target.sha256_cert_fingerprints;
    expect(listed).toEqual([
      '46:6E:2A:92:E2:11:9D:31:D7:68:2B:AB:AA:CA:10:EA:58:65:19:76:F2:97:AB:5A:52:87:92:D8:D1:F2:27:F8',
      '72:25:EF:94:91:50:01:55:00:DF:A0:8E:8C:C7:C1:07:81:AD:B9:54:8C:DC:3C:BD:FD:AB:29:48:08:F6:53:F2',
      'B5:1E:AB:34:52:A1:2C:0F:AA:34:7D:2E:85:28:F3:C8:14:2F:A8:8A:BD:F0:0E:24:A1:A0:CF:9C:93:4A:E4:9C',
      '63:7D:3C:37:0B:78:A9:CD:25:5F:41:7A:16:61:24:D8:16:DE:6F:FB:70:F4:D2:24:D7:48:B6:40:A5:DE:C5:35',
    ]);
    expect(listed).not.toContain(
      '32:57:D5:99:A4:9D:2C:96:1A:47:1C:A9:84:3F:59:D3:41:A4:05:88:45:83:FC:08:7D:F4:23:7B:73:3B:BD:6D',
    );
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
  it('names the app like the web manifest', () => {
    expect(twa.name).toBe(pwaManifest.name);
    expect(twa.launcherName).toBe(pwaManifest.short_name);
  });

  it('ships the web manifest with the new name, standalone and no local URL', () => {
    const raw = readFileSync(resolve(root, 'android/app/src/main/res/raw/web_app_manifest.json'), 'utf8');
    const web = JSON.parse(raw);
    expect(web.name).toBe('FlashCards - Learn & Memorize');
    expect(web.display).toBe('standalone');
    expect(raw).not.toContain('localhost');
  });

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

  // Bubblewrap reads the version name from `appVersion`; an `appVersionName` key is silently ignored.
  it('versions the app like package.json', () => {
    expect(twa.appVersion).toBe(readJson('package.json').version);
    expect(twa).not.toHaveProperty('appVersionName');
  });

  // Left unset, Bubblewrap writes `splashScreenFadeOutDuration: ,` and the Gradle build fails to compile.
  it('sets the splash fade-out Bubblewrap needs', () => {
    expect(twa.splashScreenFadeOutDuration).toBe(300);
  });
});

describe('android/app/build.gradle', () => {
  const gradle = readFileSync(resolve(root, 'android/app/build.gradle'), 'utf8');
  const sdk = (key: string) => Number(new RegExp(`${key}\\s+(\\d+)`).exec(gradle)?.[1]);

  it('targets API 36 or later', () => {
    expect(sdk('targetSdkVersion')).toBeGreaterThanOrEqual(36);
    expect(sdk('compileSdkVersion')).toBeGreaterThanOrEqual(36);
  });

  // androidbrowserhelper 2.7.4 declares minSdk 24; Bubblewrap's default of 21 fails the manifest merge.
  it('supports no Android older than the TWA library does', () => {
    expect(sdk('minSdkVersion')).toBeGreaterThanOrEqual(24);
  });

  it('has no value Bubblewrap left empty', () => {
    expect(gradle).not.toMatch(/:\s*,/);
    expect(gradle).toMatch(/versionName "\d+\.\d+\.\d+"/);
  });
});

// Chrome 152+ checks that the sender holds a grant on the splash URI; the library never grants it to itself
// (GoogleChrome/android-browser-helper#623), so LauncherActivity does it before the launch starts.
describe('LauncherActivity.java', () => {
  const java = readFileSync(
    resolve(root, 'android/app/src/main/java/in/spanion/flashcards/twa/LauncherActivity.java'),
    'utf8',
  );
  const grantBody = /private void grantSplashUriPermission\(\)\s*\{([\s\S]*?)\n    \}\n/.exec(java)?.[1] ?? '';

  it('grants the splash URI before super.onCreate(', () => {
    const grantCall = java.indexOf('grantSplashUriPermission();');
    const superCall = java.indexOf('super.onCreate(');
    expect(grantCall).toBeGreaterThan(-1);
    expect(grantCall).toBeLessThan(superCall);
  });

  it('grants the app itself read and persistable access', () => {
    expect(grantBody).toContain('grantUriPermission(');
    expect(grantBody).toContain('getPackageName()');
    expect(grantBody).toContain('Intent.FLAG_GRANT_READ_URI_PERMISSION');
    expect(grantBody).toContain('Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION');
  });

  it('builds the URI from the provider authority and the splash file under getFilesDir()', () => {
    expect(grantBody).toContain('FileProvider.getUriForFile');
    expect(grantBody).toContain('getString(R.string.providerAuthority)');
    expect(grantBody).toContain('getFilesDir()');
    expect(grantBody).toContain('twa_splash/splash_image.png');
  });

  it('logs a failure with Log.w and lets the launch go on', () => {
    expect(grantBody).toMatch(/try\s*\{[\s\S]*\}\s*catch\s*\(Exception \w+\)\s*\{[\s\S]*Log\.w\(/);
  });
});

describe('git ignore', () => {
  it.each(['android/app/build/', 'android/local.properties', 'x.jks'])('ignores %s', (path) => {
    const out = execFileSync('git', ['check-ignore', path], { cwd: root }).toString().trim();
    expect(out).toBe(path);
  });
});
