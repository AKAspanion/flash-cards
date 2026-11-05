import { describe, expect, it } from 'vitest';
import en from '@/locales/en.json';
import hi from '@/locales/hi.json';
import {
  DEFAULT_REMINDER_TIME,
  REMINDER_FILE_NAME,
  buildDailyReminderIcs,
  isReminderTime,
} from '@/utils/ics';

const NOW = new Date(2026, 10, 2, 22, 15, 0); // 2 November 2026, 22:15 local
const URL = 'https://flashcards.spanion.in/';

function build(overrides: Partial<Parameters<typeof buildDailyReminderIcs>[0]> = {}): string {
  return buildDailyReminderIcs({
    time: '07:30',
    summary: 'Study flashcards',
    url: URL,
    now: NOW,
    uid: 'abc@flashcards',
    ...overrides,
  });
}

function lines(ics: string): string[] {
  return ics.split('\r\n');
}

function unfold(ics: string): string[] {
  return lines(ics.replace(/\r\n /g, ''));
}

function utc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

describe('constants', () => {
  it('names the file and the default time', () => {
    expect(REMINDER_FILE_NAME).toBe('flashcards-reminder.ics');
    expect(DEFAULT_REMINDER_TIME).toBe('19:00');
  });
});

describe('isReminderTime', () => {
  it.each(['00:00', '07:30', '23:59'])('accepts %s', (value) => {
    expect(isReminderTime(value)).toBe(true);
  });

  it.each(['24:00', '7:30', '07:60', '07:30:00', '', null, 730])('refuses %s', (value) => {
    expect(isReminderTime(value)).toBe(false);
  });
});

describe('buildDailyReminderIcs', () => {
  it('builds a calendar with the event fields', () => {
    const ics = build();
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    const all = lines(ics);
    for (const line of [
      'VERSION:2.0',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'DTSTART:20261102T073000',
      'RRULE:FREQ=DAILY',
      'SUMMARY:Study flashcards',
      'UID:abc@flashcards',
      `URL:${URL}`,
      `DESCRIPTION:${URL.replace(/[\\;,]/g, '\\$&')}`,
    ]) {
      expect(all).toContain(line);
    }
    expect(all.some((l) => l.startsWith('PRODID:'))).toBe(true);
  });

  it('uses floating local time for DTSTART and UTC for DTSTAMP', () => {
    const all = lines(build());
    const start = all.find((l) => l.startsWith('DTSTART'));
    expect(start).toBe('DTSTART:20261102T073000');
    expect(start).not.toContain('TZID');
    expect(start).not.toMatch(/Z$/);
    const stamp = all.find((l) => l.startsWith('DTSTAMP'));
    expect(stamp).toMatch(/^DTSTAMP:\d{8}T\d{6}Z$/);
    expect(stamp).toBe(`DTSTAMP:${utc(NOW)}`);
  });

  it('ends every line in CRLF with no bare line feed inside a line', () => {
    const parts = lines(build());
    expect(parts[parts.length - 1]).toBe('');
    for (const line of parts) {
      expect(line).not.toContain('\n');
      expect(line).not.toContain('\r');
    }
  });

  it('escapes backslash, semicolon, comma and line breaks in text values', () => {
    const all = lines(build({ summary: 'Study, review; repeat\\ now' }));
    expect(all).toContain('SUMMARY:Study\\, review\\; repeat\\\\ now');
    const withBreak = lines(build({ summary: 'a\r\nb\nc' }));
    expect(withBreak).toContain('SUMMARY:a\\nb\\nc');
  });

  it('folds long Devanagari text at 75 octets without splitting a character', () => {
    const summary = 'अ'.repeat(60); // 180 UTF-8 bytes
    const ics = build({ summary });
    const decoder = new TextDecoder('utf-8', { fatal: true });
    for (const line of lines(ics)) {
      const bytes = new TextEncoder().encode(line);
      expect(bytes.length).toBeLessThanOrEqual(75);
      expect(() => decoder.decode(bytes)).not.toThrow();
    }
    const physical = lines(ics);
    const first = physical.findIndex((l) => l.startsWith('SUMMARY:'));
    expect(physical[first + 1].startsWith(' ')).toBe(true);
    expect(unfold(ics)).toContain(`SUMMARY:${summary}`);
  });

  it('folds a long URL and unfolds it to the original', () => {
    const url = `https://flashcards.spanion.in/${'a'.repeat(90)}`;
    expect(url).toHaveLength(120);
    const ics = build({ url });
    for (const line of lines(ics)) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
    expect(lines(ics).some((l) => l.startsWith(' '))).toBe(true);
    expect(unfold(ics)).toContain(`URL:${url}`);
  });

  it('adds an alert at the start of the event', () => {
    const all = lines(build());
    const begin = all.indexOf('BEGIN:VALARM');
    const end = all.indexOf('END:VALARM');
    expect(begin).toBeGreaterThan(-1);
    const alarm = all.slice(begin, end + 1);
    expect(alarm).toContain('ACTION:DISPLAY');
    expect(alarm).toContain('TRIGGER:PT0M');
    expect(alarm).toContain('DESCRIPTION:Study flashcards');
  });

  it('throws for a time that is not HH:MM', () => {
    expect(() => build({ time: '25:00' })).toThrow();
  });
});

describe('reminder copy', () => {
  it('has the four new keys in English and Hindi', () => {
    for (const messages of [en, hi] as const) {
      const m = messages as unknown as {
        settings: { reminder: Record<string, string> };
        reminder: Record<string, string>;
      };
      expect(m.settings.reminder.title).toBeTruthy();
      expect(m.settings.reminder.desc).toBeTruthy();
      expect(m.settings.reminder.add).toBeTruthy();
      expect(m.reminder.summary).toBeTruthy();
    }
    expect(en.settings.reminder.title).toBe('Daily reminder');
    expect(en.settings.reminder.desc).toBe('Add a daily study reminder to your calendar.');
    expect(en.settings.reminder.add).toBe('Add to calendar');
    expect(en.reminder.summary).toBe('Study flashcards');
  });
});
