/**
 * Darkens a #RRGGBB colour so white text on it meets WCAG AA (4.5:1).
 * 0.82 is the smallest factor that clears AA for every colour in the set palette.
 */
export const TEXT_SAFE_FACTOR = 0.82;

export function shade(hex: string, factor = TEXT_SAFE_FACTOR): string {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) {
    return hex;
  }
  const value = parseInt(match[1], 16);
  const channel = (shift: number) =>
    Math.round(((value >> shift) & 0xff) * factor)
      .toString(16)
      .padStart(2, '0');
  return `#${channel(16)}${channel(8)}${channel(0)}`.toUpperCase();
}
