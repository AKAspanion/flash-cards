import { describe, expect, it } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import {
  cardSetFromDoc,
  cardSetToDoc,
  fitsSharedLimit,
  isShareId,
  labelFromDoc,
  sharedSetFromDoc,
  SHARED_CARDS_MAX,
  SHARED_TITLE_MAX,
  toSharedDoc,
} from '@/services/cardSetMapper';
import { cardsByteSize, fitsSizeLimit, MAX_CARDS_BYTES } from '@/utils/setSize';
import type { CardSet } from '@/types';

const card = { id: 'c1', front: 'Q', back: 'A', learned: true, date: '2020-01-01T00:00:00.000Z' };

describe('cardSetFromDoc', () => {
  it('reads a document written by the original app', () => {
    const date = new Date('2020-03-04T05:06:07Z');
    const set = cardSetFromDoc('doc1', {
      id: '_abc',
      uid: 'u1',
      title: 'Spanish',
      color: '#43A047',
      date: Timestamp.fromDate(date),
      trashed: false,
      fav: true,
      labels: ['l1'],
      cards: JSON.stringify([card]),
      docId: 'stale-field-from-old-writes',
    });
    expect(set).toEqual({
      docId: 'doc1',
      id: '_abc',
      title: 'Spanish',
      color: '#43A047',
      date,
      trashed: false,
      fav: true,
      labels: ['l1'],
      cards: [card],
    });
  });

  it('turns Firestore Timestamps into real Dates so sorting by date works', () => {
    const set = cardSetFromDoc('d', { date: new Timestamp(1_600_000_000, 0), cards: '[]' });
    expect(set.date).toBeInstanceOf(Date);
    expect(set.date.getTime()).toBe(1_600_000_000_000);
  });

  it('survives missing and corrupt fields instead of crashing', () => {
    const set = cardSetFromDoc('d2', { cards: '{not json', labels: 'oops', date: 'garbage' });
    expect(set).toMatchObject({ id: 'd2', title: '', color: '#E91E63', labels: [], cards: [], trashed: false, fav: false });
    expect(set.date.getTime()).toBe(0);
  });

  it('fills in missing card fields', () => {
    const set = cardSetFromDoc('d3', { cards: JSON.stringify([{ front: 'only front' }, null]) });
    expect(set.cards).toEqual([{ id: 'card-0', front: 'only front', back: '', learned: false, date: new Date(0).toISOString() }]);
  });
});

describe('cardSetToDoc', () => {
  it('writes the original schema and never stores docId', () => {
    const set: CardSet = {
      docId: 'doc1',
      id: '_abc',
      title: 'T',
      color: '#000000',
      date: new Date('2021-01-01T00:00:00Z'),
      trashed: true,
      fav: false,
      labels: ['l1'],
      cards: [card],
    };
    const doc = cardSetToDoc(set, 'u1');
    expect(doc).not.toHaveProperty('docId');
    expect(doc.uid).toBe('u1');
    expect(doc.cards).toBe(JSON.stringify([card]));
    expect(doc.date).toBeInstanceOf(Timestamp);
    expect(cardSetFromDoc('doc1', doc)).toEqual(set);
  });
});

describe('study-mode fields', () => {
  const srsCard = {
    id: 'a', front: 'f', back: 'b', learned: true, date: '2026-01-01T00:00:00.000Z',
    srs: { due: '2026-11-05', interval: 3, ease: 2.5, reps: 2, lapses: 0 },
  };
  const base: CardSet = { id: 'x', title: 'T', color: '#000000', date: new Date('2021-01-01T00:00:00Z'), trashed: false, fav: false, labels: [], cards: [] };

  it('keeps unknown card fields through a read and write', () => {
    const set = cardSetFromDoc('d', { cards: JSON.stringify([srsCard]) });
    const doc = cardSetToDoc(set, 'u1');
    expect(JSON.parse(doc.cards)[0].srs).toEqual(srsCard.srs);
  });

  it('normalises known fields but keeps extra keys', () => {
    const set = cardSetFromDoc('d', { cards: JSON.stringify([{ id: 'a', front: 5, note: 'x' }]) });
    expect(set.cards[0]).toMatchObject({ front: '', note: 'x' });
  });

  it('reads studiedAt from a Timestamp or { seconds }', () => {
    const at = new Date('2026-10-30T10:00:00Z');
    expect(cardSetFromDoc('d', { studiedAt: Timestamp.fromDate(at) }).studiedAt).toEqual(at);
    expect(cardSetFromDoc('d', { studiedAt: { seconds: at.getTime() / 1000 } }).studiedAt).toEqual(at);
  });

  it('leaves studiedAt undefined when missing or unreadable', () => {
    expect(cardSetFromDoc('d', {}).studiedAt).toBeUndefined();
    expect(cardSetFromDoc('d', { studiedAt: 'garbage' }).studiedAt).toBeUndefined();
  });

  it('writes studiedAt only when the set has one', () => {
    expect(cardSetToDoc(base, 'u1')).not.toHaveProperty('studiedAt');
    const at = new Date('2026-10-30T10:00:00Z');
    const doc = cardSetToDoc({ ...base, studiedAt: at }, 'u1');
    expect(doc.studiedAt).toBeInstanceOf(Timestamp);
    expect(doc.studiedAt.toDate()).toEqual(at);
  });
});

describe('speech field', () => {
  const base: CardSet = { id: 'x', title: 'T', color: '#000000', date: new Date('2021-01-01T00:00:00Z'), trashed: false, fav: false, labels: [], cards: [] };

  it('reads a stored speech value', () => {
    expect(cardSetFromDoc('d', { speech: { front: 'es-ES', back: 'en' } }).speech).toEqual({ front: 'es-ES', back: 'en' });
  });

  it('drops a side that is not a language tag', () => {
    expect(cardSetFromDoc('d', { speech: { front: 'not a tag!', back: 42 } }).speech).toEqual({});
  });

  it('drops a tag longer than 35 characters', () => {
    const ok = 'en-aaaaaaaa-aaaaaaaa-aaaaaaaa-aaaa'; // 8-char subtags keep it a valid tag
    const long = `${ok}a`;
    expect([ok.length, long.length]).toEqual([34, 35]);
    const tooLong = `${long}a`;
    expect(tooLong).toHaveLength(36);
    expect(cardSetFromDoc('d', { speech: { front: tooLong, back: long } }).speech).toEqual({ back: long });
  });

  it('has no speech key when none is stored, in either direction', () => {
    expect(cardSetFromDoc('d', {})).not.toHaveProperty('speech');
    expect(cardSetToDoc(cardSetFromDoc('d', {}), 'u1')).not.toHaveProperty('speech');
  });

  it('writes only the sides that are set', () => {
    const doc = cardSetToDoc({ ...base, speech: { front: 'hi-IN' } }, 'u1');
    expect(doc.speech).toEqual({ front: 'hi-IN' });
    expect(doc.speech).not.toHaveProperty('back');
    expect(cardSetToDoc({ ...base, speech: { front: 'hi-IN', back: undefined } }, 'u1').speech).not.toHaveProperty('back');
  });

  it('writes an empty speech object as it is', () => {
    expect(cardSetToDoc({ ...base, speech: {} }, 'u1').speech).toEqual({});
  });
});

describe('shareId field', () => {
  const base: CardSet = { id: 'x', title: 'T', color: '#000000', date: new Date('2021-01-01T00:00:00Z'), trashed: false, fav: false, labels: [], cards: [] };

  it('writes shareId only when the set has one', () => {
    expect(cardSetToDoc({ ...base, shareId: 'abc' }, 'u1').shareId).toBe('abc');
    expect(cardSetToDoc(base, 'u1')).not.toHaveProperty('shareId');
    expect(cardSetToDoc({ ...base, shareId: undefined }, 'u1')).not.toHaveProperty('shareId');
  });

  it('reads shareId only when it is a string', () => {
    expect(cardSetFromDoc('d', { shareId: 'abc' }).shareId).toBe('abc');
    expect(cardSetFromDoc('d', { shareId: 42 })).not.toHaveProperty('shareId');
    expect(cardSetFromDoc('d', {})).not.toHaveProperty('shareId');
  });
});

describe('toSharedDoc', () => {
  const set: CardSet = {
    docId: 'doc1',
    id: '_abc',
    title: 'Spanish verbs',
    color: '#43A047',
    date: new Date('2021-01-01T00:00:00Z'),
    trashed: false,
    fav: true,
    labels: ['l1'],
    shareId: 'AbCdEfGhIjKlMnOpQrSt',
    studiedAt: new Date('2026-11-01T00:00:00Z'),
    speech: { front: 'es-ES' },
    cards: [
      {
        id: 'c1', front: 'Q', back: 'A', learned: true, date: '2020-01-01T00:00:00.000Z',
        srs: { due: '2026-11-02', interval: 3, ease: 2.5, reps: 2, lapses: 0 },
        extra: 'x',
      } as CardSet['cards'][number],
    ],
  };

  it('holds exactly the five public fields and the given owner', () => {
    const doc = toSharedDoc(set, 'alice');
    expect(Object.keys(doc).sort()).toEqual(['cards', 'color', 'ownerUid', 'title', 'updatedAt']);
    expect(doc.ownerUid).toBe('alice');
    expect(doc.title).toBe('Spanish verbs');
    expect(doc.color).toBe('#43A047');
    expect(doc.updatedAt).toBeDefined();
  });

  it('strips progress and every other card field', () => {
    const cards = JSON.parse(toSharedDoc(set, 'alice').cards);
    expect(cards).toEqual([{ id: 'c1', front: 'Q', back: 'A', date: '2020-01-01T00:00:00.000Z', learned: false }]);
    expect(cards[0]).not.toHaveProperty('srs');
    expect(cards[0]).not.toHaveProperty('extra');
  });

  it('cuts the title to 200 characters', () => {
    const long = 'a'.repeat(150) + 'b'.repeat(100);
    const title = toSharedDoc({ ...set, title: long }, 'alice').title;
    expect(SHARED_TITLE_MAX).toBe(200);
    expect(title).toHaveLength(200);
    expect(title).toBe(long.slice(0, 200));
  });

  it('replaces a colour that is not # and 6 hex digits', () => {
    expect(toSharedDoc({ ...set, color: 'red; background:url(x)' }, 'alice').color).toBe('#E91E63');
    expect(toSharedDoc({ ...set, color: '#43A04' }, 'alice').color).toBe('#E91E63');
    expect(toSharedDoc({ ...set, color: '#43A047 ' }, 'alice').color).toBe('#E91E63');
  });
});

describe('fitsSharedLimit', () => {
  /** Learned cards whose stored JSON is exactly the 900,000-byte save limit. */
  function learnedCardsAtSaveLimit() {
    const cards = Array.from({ length: 1000 }, (_, i) => ({ ...card, id: `c${i}`, front: '', back: '' }));
    cards[0].front = 'x'.repeat(MAX_CARDS_BYTES - cardsByteSize(cards));
    return cards;
  }

  it('measures the cards string the public copy is written with', () => {
    const cards = learnedCardsAtSaveLimit();
    expect(fitsSizeLimit(cards)).toBe(true);
    const sharedLength = toSharedDoc(setOf(cards), 'alice').cards.length;
    expect(sharedLength).toBeGreaterThan(SHARED_CARDS_MAX);
    expect(fitsSharedLimit(cards)).toBe(false);
  });

  it('accepts a copy at the limit', () => {
    const cards = [{ ...card, learned: false, front: '' }];
    cards[0].front = 'x'.repeat(SHARED_CARDS_MAX - toSharedDoc(setOf(cards), 'alice').cards.length);
    expect(toSharedDoc(setOf(cards), 'alice').cards).toHaveLength(SHARED_CARDS_MAX);
    expect(fitsSharedLimit(cards)).toBe(true);
  });

  function setOf(cards: CardSet['cards']): CardSet {
    return { id: 's', title: 't', color: '#43A047', date: new Date(0), trashed: false, fav: false, labels: [], cards };
  }
});

describe('sharedSetFromDoc', () => {
  const stored = { ownerUid: 'alice', title: 'Spanish verbs', color: '#43A047', cards: JSON.stringify([card]), updatedAt: new Timestamp(1, 0) };

  it('reads the public fields and nothing else', () => {
    expect(sharedSetFromDoc('AbCdEfGhIjKlMnOpQrSt', stored)).toEqual({
      shareId: 'AbCdEfGhIjKlMnOpQrSt',
      title: 'Spanish verbs',
      color: '#43A047',
      cards: [card],
    });
  });

  it('replaces a colour that is not # and 6 hex digits', () => {
    expect(sharedSetFromDoc('s', { ...stored, color: 'red; background:url(x)' }).color).toBe('#E91E63');
    expect(sharedSetFromDoc('s', { ...stored, color: 7 }).color).toBe('#E91E63');
  });

  it('survives corrupt cards and a non-string title', () => {
    const shared = sharedSetFromDoc('s', { ...stored, cards: 'not json', title: { evil: true } });
    expect(shared.cards).toEqual([]);
    expect(shared.title).toBe('');
  });
});

describe('isShareId', () => {
  it('accepts a 20-character alphanumeric id', () => {
    expect(isShareId('AbCdEfGhIjKlMnOpQrSt')).toBe(true);
    expect(isShareId('01234567890123456789')).toBe(true);
  });

  it('refuses anything else', () => {
    expect(isShareId('')).toBe(false);
    expect(isShareId('AbCdEfGhIjKlMnOpQrS')).toBe(false);
    expect(isShareId('AbCdEfGhIjKlMnOpQrStU')).toBe(false);
    expect(isShareId('../../flash-card-sets/x')).toBe(false);
    expect(isShareId('abc def ghi jkl mnopq')).toBe(false);
    expect(isShareId('AbCdEfGhIjKlMnOpQrS\n')).toBe(false);
    expect(isShareId(12345678901234567890)).toBe(false);
    expect(isShareId(null)).toBe(false);
    expect(isShareId(['AbCdEfGhIjKlMnOpQrSt'])).toBe(false);
  });
});

describe('labelFromDoc', () => {
  it('maps a label document', () => {
    expect(labelFromDoc('l1', { label: 'Verbs', uid: 'u1' })).toEqual({ docId: 'l1', label: 'Verbs' });
  });
});
