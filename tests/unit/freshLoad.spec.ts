import { describe, expect, it, vi } from 'vitest';
import { PENDING_SNACK_KEY, loadFresh, takePendingSnack } from '@/utils/freshLoad';

function memoryStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (i) => [...items.keys()][i] ?? null,
    removeItem: (key) => void items.delete(key),
    setItem: (key, value) => void items.set(key, String(value)),
  };
}

const blockedStorage = {
  getItem: () => {
    throw new DOMException('denied', 'SecurityError');
  },
  setItem: () => {
    throw new DOMException('denied', 'SecurityError');
  },
  removeItem: () => {
    throw new DOMException('denied', 'SecurityError');
  },
} as unknown as Storage;

describe('loadFresh', () => {
  it('loads the path as a new page', () => {
    const location = { assign: vi.fn() };
    loadFresh('/login', undefined, memoryStorage(), location);
    expect(location.assign).toHaveBeenCalledWith('/login');
  });

  it('leaves the snack for the new page to show, once', () => {
    const storage = memoryStorage();
    loadFresh('/login', 'Your account has been deleted.', storage, { assign: vi.fn() });
    expect(takePendingSnack(storage)).toBe('Your account has been deleted.');
    expect(takePendingSnack(storage)).toBeNull();
  });

  it('leaves no snack when none is given', () => {
    const storage = memoryStorage();
    storage.setItem(PENDING_SNACK_KEY, 'old');
    loadFresh('/login', undefined, storage, { assign: vi.fn() });
    expect(takePendingSnack(storage)).toBeNull();
  });

  it('still loads the page when storage is blocked', () => {
    const location = { assign: vi.fn() };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    loadFresh('/login', 'text', blockedStorage, location);
    expect(location.assign).toHaveBeenCalledWith('/login');
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
    expect(takePendingSnack(blockedStorage)).toBeNull();
  });
});
