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
