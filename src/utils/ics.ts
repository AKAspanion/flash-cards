export const REMINDER_FILE_NAME = 'flashcards-reminder.ics';
export const DEFAULT_REMINDER_TIME = '19:00';

const MAX_LINE_OCTETS = 75;
const encoder = new TextEncoder();

/** True for a 'HH:MM' string from 00:00 to 23:59. */
export function isReminderTime(value: unknown): value is string {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export interface DailyReminder {
  /** 'HH:MM', local. */
  time: string;
  /** Event title, already translated. */
  summary: string;
  /** The app's address. */
  url: string;
  /** Gives the first day (local date) and DTSTAMP. */
  now: Date;
  /** Unique id for the event. */
  uid: string;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** RFC 5545 TEXT escaping: backslash, semicolon, comma and line breaks. */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

/** Folds a content line to at most 75 octets per physical line, never splitting a character. */
function fold(line: string): string[] {
  const out: string[] = [];
  let current = '';
  let size = 0;
  // A continuation line starts with one space, which counts toward its 75 octets.
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    if (size + bytes > MAX_LINE_OCTETS) {
      out.push(current);
      current = ' ';
      size = 1;
    }
    current += char;
    size += bytes;
  }
  out.push(current);
  return out;
}

function utcStamp(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

/** A daily repeating calendar event at a local time, with an alert at its start. */
export function buildDailyReminderIcs(reminder: DailyReminder): string {
  const { time, summary, url, now, uid } = reminder;
  if (!isReminderTime(time)) {
    throw new Error(`Invalid reminder time: ${String(time)}`);
  }
  const day = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const start = `${day}T${time.slice(0, 2)}${time.slice(3, 5)}00`;
  const text = escapeText(summary);

  const content = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Flashcards//Daily reminder//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${utcStamp(now)}`,
    `DTSTART:${start}`,
    'RRULE:FREQ=DAILY',
    `SUMMARY:${text}`,
    `DESCRIPTION:${escapeText(url)}`,
    `URL:${url}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'TRIGGER:PT0M',
    `DESCRIPTION:${text}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return content.flatMap(fold).map((line) => `${line}\r\n`).join('');
}
