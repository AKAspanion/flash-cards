import { describe, expect, it, vi } from 'vitest';
import { chooseLocalCache } from '@/services/localCache';

describe('chooseLocalCache', () => {
  it('uses the persistent cache when IndexedDB is there', () => {
    expect(chooseLocalCache({ indexedDB: {} })).toBe('persistent');
  });

  it('falls back to memory without IndexedDB', () => {
    expect(chooseLocalCache({})).toBe('memory');
    expect(chooseLocalCache({ indexedDB: undefined })).toBe('memory');
    expect(chooseLocalCache({ indexedDB: null })).toBe('memory');
  });

  it('falls back to memory when reading IndexedDB throws', () => {
    // Sandboxed frames and some private modes throw a SecurityError on access.
    const scope = {
      get indexedDB(): unknown {
        throw new DOMException('denied', 'SecurityError');
      },
    };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(chooseLocalCache(scope)).toBe('memory');
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });
});
