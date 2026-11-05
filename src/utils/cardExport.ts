import type { CardSet, FlashCard, Label } from '@/types';
import { localDate } from '@/utils/dates';

export interface SetExport {
  format: 'flashcards-set';
  version: 1;
  title: string;
  color: string;
  cards: FlashCard[];
}
export interface BackupSet {
  title: string;
  color: string;
  fav: boolean;
  labels: string[];
  date: string;
  cards: FlashCard[];
}
export interface Backup {
  format: 'flashcards-backup';
  version: 1;
  exportedAt: string;
  labels: Label[];
  sets: BackupSet[];
}

const BOM = '﻿';

function csvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function setToCsv(set: CardSet): string {
  const rows = set.cards.map((c) => [csvField(c.front), csvField(c.back), String(c.learned)].join(','));
  return BOM + ['front,back,learned', ...rows].map((r) => `${r}\r\n`).join('');
}

export function setToJson(set: CardSet): string {
  const data: SetExport = {
    format: 'flashcards-set',
    version: 1,
    title: set.title,
    color: set.color,
    cards: set.cards,
  };
  return JSON.stringify(data, null, 2);
}

export function exportFileName(title: string, extension: 'csv' | 'json'): string {
  const safe = title.replace(/[^\p{L}\p{M}\p{N}_-]/gu, '-');
  const base = /[\p{L}\p{N}]/u.test(safe) ? safe : 'flashcards-set';
  return `${base}.${extension}`;
}

export function backupFileName(today: Date): string {
  return `flashcards-backup-${localDate(today)}.json`;
}

export function buildBackup(sets: CardSet[], labels: Label[], now: Date): Backup {
  return {
    format: 'flashcards-backup',
    version: 1,
    exportedAt: now.toISOString(),
    labels: labels.map((l) => ({ docId: l.docId, label: l.label })),
    sets: sets
      .filter((s) => !s.trashed)
      .map((s) => ({
        title: s.title,
        color: s.color,
        fav: s.fav,
        labels: s.labels,
        date: s.date.toISOString(),
        cards: s.cards,
      })),
  };
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Reads a backup file's text; null when it is not a valid backup. Card fields it does not know are kept. */
export function parseBackup(text: string): Backup | null {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isObject(data) || data.format !== 'flashcards-backup' || data.version !== 1) return null;
  if (!Array.isArray(data.sets) || !Array.isArray(data.labels)) return null;
  const labels: Label[] = [];
  for (const l of data.labels) {
    if (!isObject(l) || typeof l.docId !== 'string' || typeof l.label !== 'string') return null;
    labels.push({ docId: l.docId, label: l.label });
  }
  const sets: BackupSet[] = [];
  for (const s of data.sets) {
    if (!isObject(s) || typeof s.title !== 'string' || !Array.isArray(s.cards)) return null;
    for (const c of s.cards) {
      if (!isObject(c) || typeof c.front !== 'string' || typeof c.back !== 'string') return null;
    }
    sets.push({
      title: s.title,
      color: typeof s.color === 'string' ? s.color : '',
      fav: s.fav === true,
      labels: Array.isArray(s.labels) ? s.labels.filter((x): x is string => typeof x === 'string') : [],
      date: typeof s.date === 'string' ? s.date : '',
      cards: s.cards as FlashCard[],
    });
  }
  return {
    format: 'flashcards-backup',
    version: 1,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
    labels,
    sets,
  };
}
