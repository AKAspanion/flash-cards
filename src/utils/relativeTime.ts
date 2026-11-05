const MINUTE = 60;
const HOUR = 3600;
const DAY = 86400;

/** "3 days ago", "yesterday", in the given locale; a date after `now` reads as the present. */
export function relativeTime(date: Date, now: Date, locale: string): string {
  const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const seconds = Math.max(0, Math.trunc((now.getTime() - date.getTime()) / 1000));
  const days = Math.trunc(seconds / DAY);
  if (seconds < MINUTE) return format.format(-seconds, 'second');
  if (seconds < HOUR) return format.format(-Math.trunc(seconds / MINUTE), 'minute');
  if (seconds < DAY) return format.format(-Math.trunc(seconds / HOUR), 'hour');
  if (days < 30) return format.format(-days, 'day');
  if (days < 360) return format.format(-Math.trunc(days / 30), 'month');
  return format.format(-Math.trunc(days / 365), 'year');
}
