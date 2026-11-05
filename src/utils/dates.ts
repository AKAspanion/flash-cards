function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** 'YYYY-MM-DD' in the device's time zone. */
export function localDate(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** 'YYYY-MM-DD' plus or minus whole calendar days (computed in UTC, so daylight saving cannot shift it). */
export function addDays(day: string, days: number): string {
  const [y, m, d] = day.split('-').map(Number);
  const result = new Date(Date.UTC(y, m - 1, d + days));
  return `${result.getUTCFullYear()}-${pad(result.getUTCMonth() + 1)}-${pad(result.getUTCDate())}`;
}
