import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  backupFileName,
  buildBackup,
  exportFileName,
  parseBackup,
  setToCsv,
  setToJson,
} from '@/utils/cardExport';
import { downloadText } from '@/utils/download';
import type { CardSet, FlashCard } from '@/types';

function card(front: string, back: string, extra: Record<string, unknown> = {}): FlashCard {
  return { id: `c-${front}`, front, back, learned: false, date: '2026-11-01', ...extra } as FlashCard;
}
function makeSet(title: string, cards: FlashCard[] = [], over: Partial<CardSet> = {}): CardSet {
  return {
    docId: `d-${title}`,
    id: `s-${title}`,
    title,
    color: '#123456',
    date: new Date('2026-11-01T10:00:00Z'),
    trashed: false,
    fav: false,
    labels: [],
    cards,
    ...over,
  };
}
const BOM = '﻿';

describe('setToCsv', () => {
  it('writes the header and one row with a BOM and CRLF', () => {
    expect(setToCsv(makeSet('t', [card('hola', 'hello')]))).toBe(
      `${BOM}front,back,learned\r\nhola,hello,false\r\n`,
    );
  });
  it('quotes commas, quotes and line breaks', () => {
    const csv = setToCsv(makeSet('t', [card('Paris, France', 'say "hi"'), card('a', 'l1\nl2')]));
    expect(csv).toContain('"Paris, France","say ""hi""",false\r\n');
    expect(csv).toContain('a,"l1\nl2",false\r\n');
  });
  it('keeps Hindi text unchanged', () => {
    expect(setToCsv(makeSet('t', [card('नमस्ते', 'hello')]))).toBe(
      `${BOM}front,back,learned\r\nनमस्ते,hello,false\r\n`,
    );
  });
});

describe('setToJson', () => {
  it('serialises the set with every card field', () => {
    const parsed = JSON.parse(setToJson(makeSet('T', [card('a', 'b', { hint: 'x' })])));
    expect(parsed.format).toBe('flashcards-set');
    expect(parsed.version).toBe(1);
    expect(parsed.title).toBe('T');
    expect(parsed.color).toBe('#123456');
    expect(parsed.cards[0]).toEqual(card('a', 'b', { hint: 'x' }));
  });
});

describe('exportFileName', () => {
  it('names files after the title', () => {
    expect(exportFileName('Spanish verbs', 'csv')).toBe('Spanish-verbs.csv');
    expect(exportFileName('a/b:c', 'json')).toBe('a-b-c.json');
    expect(exportFileName('हिंदी शब्द', 'csv')).toBe('हिंदी-शब्द.csv');
  });
  it('falls back when nothing usable is left', () => {
    expect(exportFileName('', 'csv')).toBe('flashcards-set.csv');
    expect(exportFileName('!!!', 'csv')).toBe('flashcards-set.csv');
  });
});

describe('backupFileName', () => {
  it('uses the local date', () => {
    expect(backupFileName(new Date(2026, 10, 2, 23, 30))).toBe('flashcards-backup-2026-11-02.json');
  });
});

describe('buildBackup and parseBackup', () => {
  const labels = [{ docId: 'l1', label: 'Work' }];
  const sets = [
    makeSet('A', [card('a', 'b', { hint: 'x' })], { labels: ['l1'], fav: true }),
    makeSet('B', [], { trashed: true }),
    makeSet('C', [card('c', 'd')]),
  ];
  const now = new Date('2026-11-02T08:00:00Z');

  it('skips sets in the bin and keeps every label', () => {
    const backup = buildBackup(sets, labels, now);
    expect(backup.sets.map((s) => s.title)).toEqual(['A', 'C']);
    expect(backup.labels).toEqual(labels);
    expect(backup.format).toBe('flashcards-backup');
    expect(backup.version).toBe(1);
    expect(backup.exportedAt).toBe(now.toISOString());
  });
  it('round-trips', () => {
    const backup = buildBackup(sets, labels, now);
    expect(parseBackup(JSON.stringify(backup))).toEqual(backup);
  });
  it('keeps each set’s read-aloud languages, and restores a backup that has none', () => {
    const spoken = [makeSet('S', [card('a', 'b')], { speech: { front: 'es-ES', back: 'en' } }), makeSet('N')];
    const backup = buildBackup(spoken, [], now);
    expect(backup.sets[0].speech).toEqual({ front: 'es-ES', back: 'en' });
    expect(backup.sets[1]).not.toHaveProperty('speech');

    const parsed = parseBackup(JSON.stringify(backup));
    expect(parsed?.sets[0].speech).toEqual({ front: 'es-ES', back: 'en' });
    expect(parsed?.sets[1]).not.toHaveProperty('speech');
  });

  it('drops read-aloud languages that are not language tags', () => {
    const backup = buildBackup([makeSet('S')], [], now);
    const tampered = { ...backup, sets: [{ ...backup.sets[0], speech: { front: '<script>', back: 'hi-IN' } }] };
    expect(parseBackup(JSON.stringify(tampered))?.sets[0].speech).toEqual({ back: 'hi-IN' });
    const junk = { ...backup, sets: [{ ...backup.sets[0], speech: 'en' }] };
    expect(parseBackup(JSON.stringify(junk))?.sets[0]).not.toHaveProperty('speech');
  });

  it('rejects anything that is not a backup', () => {
    const backup = buildBackup(sets, labels, now);
    expect(parseBackup('not json')).toBeNull();
    expect(parseBackup('{}')).toBeNull();
    expect(parseBackup(setToJson(sets[0]))).toBeNull();
    expect(parseBackup(JSON.stringify({ ...backup, version: 2 }))).toBeNull();
    expect(
      parseBackup(JSON.stringify({ ...backup, sets: [{ ...backup.sets[0], cards: [1] }] })),
    ).toBeNull();
    expect(parseBackup(JSON.stringify({ ...backup, labels: [{ docId: 1, label: 'x' }] }))).toBeNull();
  });
});

describe('downloadText', () => {
  afterEach(() => vi.restoreAllMocks());
  it('clicks a download anchor once and revokes the URL', () => {
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    downloadText('f.csv', 'data', 'text/csv');
    expect(click).toHaveBeenCalledTimes(1);
    const anchor = click.mock.contexts[0] as HTMLAnchorElement;
    expect(anchor.download).toBe('f.csv');
    expect(anchor.href).toBe('blob:x');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:x');
  });
});
