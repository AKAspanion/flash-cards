import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import en from '@/locales/en.json';
import hi from '@/locales/hi.json';

type Messages = { [key: string]: string | Messages };

function flatten(messages: Messages, prefix = ''): string[] {
  return Object.entries(messages).flatMap(([key, value]) =>
    typeof value === 'string' ? [prefix + key] : flatten(value, `${prefix}${key}.`),
  );
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      return sourceFiles(path);
    }
    return /\.(vue|ts)$/.test(name) ? [path] : [];
  });
}

const enKeys = flatten(en as Messages);
const hiKeys = flatten(hi as Messages);

describe('locales', () => {
  it('English and Hindi define the same keys', () => {
    expect(hiKeys.filter((k) => !enKeys.includes(k))).toEqual([]);
    expect(enKeys.filter((k) => !hiKeys.includes(k))).toEqual([]);
  });

  it('both languages carry the offline study messages', () => {
    for (const key of ['toast.offline-saved', 'toast.offline-delete', 'toast.offline-signout']) {
      expect(enKeys).toContain(key);
      expect(hiKeys).toContain(key);
    }
  });

  it('both languages carry the sharing messages', () => {
    const keys = [
      'share.action', 'share.desc', 'share.copy', 'share.copied', 'share.stop', 'share.stopped',
      'share.add', 'share.added', 'share.missing.title', 'share.missing.subtitle', 'share.count',
    ];
    for (const key of keys) {
      expect(enKeys).toContain(key);
      expect(hiKeys).toContain(key);
    }
  });

  it('both languages say when password reset is unavailable, with one wording for a missing email', () => {
    for (const keys of [enKeys, hiKeys]) {
      expect(keys).toContain('auth.error.reset-unavailable');
      expect(keys).toContain('email.enter');
      expect(keys).not.toContain('auth.error.missing-email');
    }
  });

  it('the public deletion steps say to type DELETE and confirm with the password or Google', () => {
    expect(en.deletion.app.body).toBe(
      'Open your profile, choose Delete account, type DELETE, and confirm with your password or Google.',
    );
    expect(hi.deletion.app.body).toContain('DELETE');
    expect(hi.deletion.app.body).toContain(hi.account.delete.password);
    expect(hi.deletion.app.body).toContain('Google');
  });

  it('every t("...") key used in the source exists', () => {
    const used = new Set<string>();
    for (const file of sourceFiles(join(__dirname, '../../src'))) {
      const source = readFileSync(file, 'utf-8');
      for (const match of source.matchAll(/\bt\(\s*['"]([\w.-]+)['"]/g)) {
        used.add(match[1]);
      }
      for (const match of source.matchAll(/['"]((?:auth\.error|toast)\.[\w.-]+)['"]/g)) {
        used.add(match[1]);
      }
    }
    expect(used.size).toBeGreaterThan(50);
    expect([...used].filter((key) => !enKeys.includes(key))).toEqual([]);
  });
});
