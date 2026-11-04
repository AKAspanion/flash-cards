import { describe, expect, it } from 'vitest';
import { authDomainFor } from '@/services/authDomain';

describe('authDomainFor', () => {
  it('uses the host serving the app', () => {
    expect(authDomainFor('flashcards.spanion.in', false, 'flashcards.spanion.in')).toBe('flashcards.spanion.in');
    expect(authDomainFor('spanion-flash-cards.web.app', false, 'flashcards.spanion.in')).toBe('spanion-flash-cards.web.app');
    expect(authDomainFor('localhost:8080', false, 'flashcards.spanion.in')).toBe('localhost:8080');
  });

  it('uses the configured domain with the emulators', () => {
    expect(authDomainFor('localhost:4317', true, 'demo.firebaseapp.com')).toBe('demo.firebaseapp.com');
  });

  it('uses the configured domain outside a browser', () => {
    expect(authDomainFor(undefined, false, 'demo.firebaseapp.com')).toBe('demo.firebaseapp.com');
  });
});
