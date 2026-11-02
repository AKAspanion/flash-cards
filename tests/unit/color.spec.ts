import { describe, expect, it } from 'vitest';
import { shade } from '@/utils/color';

const PALETTE = ['#F4511E', '#43A047', '#009688', '#1E88E5', '#5E35B1', '#8E24AA', '#827717', '#E91E63'];

function contrastWithWhite(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 1.05 / (0.2126 * r + 0.7152 * g + 0.0722 * b + 0.05);
}

describe('shade', () => {
  it('makes white text meet WCAG AA on every palette colour', () => {
    for (const color of PALETTE) {
      expect(contrastWithWhite(shade(color))).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('accepts lowercase and missing #, and leaves other values alone', () => {
    expect(shade('e91e63')).toBe(shade('#E91E63'));
    expect(shade('primary')).toBe('primary');
  });
});
