import { describe, expect, it } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import { cardSetFromDoc, cardSetToDoc, labelFromDoc } from '@/services/cardSetMapper';
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

describe('labelFromDoc', () => {
  it('maps a label document', () => {
    expect(labelFromDoc('l1', { label: 'Verbs', uid: 'u1' })).toEqual({ docId: 'l1', label: 'Verbs' });
  });
});
