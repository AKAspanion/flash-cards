import { describe, expect, it } from 'vitest';
import { statsFromDoc } from '@/services/statsMapper';

describe('statsFromDoc', () => {
  it('reads a missing document as the default goal and no days', () => {
    expect(statsFromDoc(undefined)).toEqual({ goal: 20, days: {} });
  });

  it('keeps only well-formed day keys with finite, non-negative counts', () => {
    const data = { goal: 50, days: { '2026-11-01': 4, nope: 2, '2026-11-02': -1, '2026-11-03': 'x' } };
    expect(statsFromDoc(data)).toEqual({ goal: 50, days: { '2026-11-01': 4 } });
  });

  it('drops non-finite counts', () => {
    expect(statsFromDoc({ days: { '2026-11-01': Infinity, '2026-11-02': NaN } }).days).toEqual({});
  });

  it('falls back to 20 when the goal is not one of the allowed goals', () => {
    expect(statsFromDoc({ goal: 7, days: {} }).goal).toBe(20);
    expect(statsFromDoc({ goal: '50', days: {} }).goal).toBe(20);
    expect(statsFromDoc({ days: {} }).goal).toBe(20);
  });

  it('ignores a days value that is not an object', () => {
    expect(statsFromDoc({ goal: 10, days: 'x' })).toEqual({ goal: 10, days: {} });
    expect(statsFromDoc({ goal: 10, days: [1, 2] })).toEqual({ goal: 10, days: {} });
  });

  it('never lets __proto__ or constructor keys reach the result', () => {
    const days = JSON.parse('{"__proto__": 5, "constructor": 3, "2026-11-01": 2}');
    const result = statsFromDoc({ goal: 20, days });
    expect(result.days).toEqual({ '2026-11-01': 2 });
    expect(Object.hasOwn(result.days, '__proto__')).toBe(false);
    expect(Object.hasOwn(result.days, 'constructor')).toBe(false);
    expect(Object.getPrototypeOf(result.days)).toBe(Object.prototype);
  });
});
