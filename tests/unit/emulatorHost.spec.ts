import { describe, expect, it } from 'vitest';
import { emulatorHostFor } from '@/services/emulatorHost';

describe('emulatorHostFor', () => {
  it('uses the hostname serving the app, so the auth redirect stays same-site', () => {
    expect(emulatorHostFor('localhost')).toBe('localhost');
    expect(emulatorHostFor('127.0.0.1')).toBe('127.0.0.1');
  });

  it('falls back to 127.0.0.1 for any other host', () => {
    expect(emulatorHostFor('192.168.1.20')).toBe('127.0.0.1');
    expect(emulatorHostFor('flashcards.spanion.in')).toBe('127.0.0.1');
  });

  it('falls back to 127.0.0.1 outside a browser', () => {
    expect(emulatorHostFor(undefined)).toBe('127.0.0.1');
  });
});
