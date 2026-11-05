import { onScopeDispose } from 'vue';

function isBlockedTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return true;
  if ((target as HTMLElement).isContentEditable) return true;
  return target.closest('[role="dialog"]') !== null;
}

/**
 * Keyboard shortcuts for the review screen. Keys are KeyboardEvent.key values.
 * Bindings are read on every key press; the listener goes when the calling scope is disposed.
 */
export function useStudyShortcuts(bindings: () => Record<string, () => void>): void {
  function onKeydown(e: KeyboardEvent) {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (isBlockedTarget(e.target)) return;
    const map = bindings();
    const handler = Object.prototype.hasOwnProperty.call(map, e.key) ? map[e.key] : undefined;
    if (!handler) return;
    e.preventDefault();
    handler();
  }
  window.addEventListener('keydown', onKeydown);
  onScopeDispose(() => window.removeEventListener('keydown', onKeydown));
}
