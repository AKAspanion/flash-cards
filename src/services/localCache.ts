/** Where Firestore keeps its local copy of the user's data (spec 10.1). */
export type LocalCacheKind = 'persistent' | 'memory';

/**
 * IndexedDB when the page has it, so sets survive a reload offline; memory otherwise.
 * Reading `indexedDB` throws a SecurityError in sandboxed frames and some private modes.
 */
export function chooseLocalCache(scope: { indexedDB?: unknown }): LocalCacheKind {
  try {
    return scope.indexedDB ? 'persistent' : 'memory';
  } catch (err) {
    console.warn('IndexedDB is not available; Firestore keeps its cache in memory.', (err as Error)?.name);
    return 'memory';
  }
}
