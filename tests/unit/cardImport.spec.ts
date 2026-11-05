import { describe, expect, it } from 'vitest';
import i18n from '@/plugins/i18n';
import { MAX_IMPORT_CARDS, importFormatFor, parseImport, skippedLinesText } from '@/utils/cardImport';

describe('parseImport lines', () => {
  it('splits at a tab, or at a semicolon when there is no tab', () => {
    const r = parseImport('hola\thello\nadiós;goodbye', 'lines');
    expect(r.cards).toEqual([
      { front: 'hola', back: 'hello' },
      { front: 'adiós', back: 'goodbye' },
    ]);
  });

  it('prefers the tab over a semicolon', () => {
    expect(parseImport('a;b\tc', 'lines').cards).toEqual([{ front: 'a;b', back: 'c' }]);
  });

  it('splits at the first tab only', () => {
    expect(parseImport('a\tb\tc', 'lines').cards).toEqual([{ front: 'a', back: 'b\tc' }]);
  });

  it('skips lines with no separator or an empty back, reporting line numbers', () => {
    const r = parseImport('a\tb\njust a word\nc\td\nfront\t   ', 'lines');
    expect(r.cards).toHaveLength(2);
    expect(r.skippedLines).toEqual([2, 4]);
  });

  it('ignores blank lines but still counts them', () => {
    const r = parseImport('a\tb\n\n   \nbad\nc\td', 'lines');
    expect(r.cards).toHaveLength(2);
    expect(r.skippedLines).toEqual([4]);
  });

  it('handles Windows line endings', () => {
    const r = parseImport('a\tb\r\nc\td\r\n', 'lines');
    expect(r.cards).toEqual([
      { front: 'a', back: 'b' },
      { front: 'c', back: 'd' },
    ]);
  });

  it('flags more than 1,000 cards', () => {
    const lines = (n: number) => Array.from({ length: n }, (_, i) => `f${i}\tb${i}`).join('\n');
    expect(parseImport(lines(MAX_IMPORT_CARDS + 1), 'lines').tooMany).toBe(true);
    expect(parseImport(lines(MAX_IMPORT_CARDS), 'lines').tooMany).toBe(false);
  });
});

describe('parseImport csv', () => {
  it('reads RFC 4180 quoting', () => {
    const r = parseImport('"Paris, France","capital, of ""France"""', 'csv');
    expect(r.cards).toEqual([{ front: 'Paris, France', back: 'capital, of "France"' }]);
  });

  it('keeps a quoted field with a line break as one card and numbers later lines from their start', () => {
    const r = parseImport('"two\nlines",back\nlonely\nx,y', 'csv');
    expect(r.cards).toEqual([
      { front: 'two\nlines', back: 'back' },
      { front: 'x', back: 'y' },
    ]);
    expect(r.skippedLines).toEqual([3]);
  });

  it('uses the first two columns only', () => {
    expect(parseImport('a,b,c,d', 'csv').cards).toEqual([{ front: 'a', back: 'b' }]);
  });

  it.each(['front,back', 'Front,Back', 'FRONT,BACK,LEARNED', 'front,back,learned'])(
    'treats %s as a header',
    (header) => {
      const r = parseImport(`${header}\na,b`, 'csv');
      expect(r.cards).toEqual([{ front: 'a', back: 'b' }]);
      expect(r.skippedLines).toEqual([]);
    },
  );

  it('handles CRLF and blank lines', () => {
    const r = parseImport('a,b\r\n\r\nc,d\r\n', 'csv');
    expect(r.cards).toEqual([
      { front: 'a', back: 'b' },
      { front: 'c', back: 'd' },
    ]);
    expect(r.skippedLines).toEqual([]);
  });

  it('skips a row with an empty back', () => {
    const r = parseImport('a,\nc,d', 'csv');
    expect(r.cards).toHaveLength(1);
    expect(r.skippedLines).toEqual([1]);
  });
});

describe('importFormatFor', () => {
  it('picks csv by extension, any case', () => {
    expect(importFormatFor('Cards.CSV')).toBe('csv');
    expect(importFormatFor('list.tsv')).toBe('lines');
    expect(importFormatFor('list.txt')).toBe('lines');
  });
});

describe('skippedLinesText', () => {
  it('lists at most 10 numbers then an ellipsis', () => {
    expect(skippedLinesText([3, 7, 9])).toBe('3, 7, 9');
    expect(skippedLinesText(Array.from({ length: 12 }, (_, i) => i + 1))).toBe('1, 2, 3, 4, 5, 6, 7, 8, 9, 10, …');
    expect(skippedLinesText(Array.from({ length: 10 }, (_, i) => i + 1))).toBe('1, 2, 3, 4, 5, 6, 7, 8, 9, 10');
  });
});

describe('import copy plurals', () => {
  const t = (key: string, named: Record<string, unknown>, count: number) => i18n.global.t(key, named, count);

  it('chooses singular or plural by count', () => {
    expect(t('add.import.ready', { n: 1 }, 1)).toBe('1 card ready to add');
    expect(t('add.import.ready', { n: 2 }, 2)).toBe('2 cards ready to add');
    expect(t('add.import.skipped', { k: 1, list: '4' }, 1)).toBe('1 line skipped (no back side): line 4');
    expect(t('add.import.skipped', { k: 2, list: '4, 5' }, 2)).toBe('2 lines skipped (no back side): lines 4, 5');
    expect(t('toast.restored', { n: 1 }, 1)).toBe('Restored 1 set.');
    expect(t('toast.restored', { n: 3 }, 3)).toBe('Restored 3 sets.');
  });
});
