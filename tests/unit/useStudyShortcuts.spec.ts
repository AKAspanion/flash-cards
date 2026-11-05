import { afterEach, describe, expect, it, vi } from 'vitest';
import { effectScope, ref, type EffectScope } from 'vue';
import { useStudyShortcuts } from '@/composables/useStudyShortcuts';

let scope: EffectScope | undefined;
afterEach(() => {
  scope?.stop();
  scope = undefined;
  document.body.innerHTML = '';
});

function setup(bindings: () => Record<string, () => void>) {
  scope = effectScope();
  scope.run(() => useStudyShortcuts(bindings));
}

function press(init: KeyboardEventInit, target: EventTarget = window) {
  const e = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(e);
  return e;
}

describe('useStudyShortcuts', () => {
  it('calls the binding and prevents default', () => {
    const spy = vi.fn();
    setup(() => ({ k: spy }));
    const e = press({ key: 'k' });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(e.defaultPrevented).toBe(true);
  });

  it.each(['ctrlKey', 'altKey', 'metaKey'])('ignores %s', (mod) => {
    const spy = vi.fn();
    setup(() => ({ k: spy }));
    press({ key: 'k', [mod]: true });
    expect(spy).not.toHaveBeenCalled();
  });

  it('ignores input, textarea, select and contenteditable targets', () => {
    const spy = vi.fn();
    setup(() => ({ k: spy }));
    for (const tag of ['input', 'textarea', 'select']) {
      const el = document.body.appendChild(document.createElement(tag));
      press({ key: 'k' }, el);
    }
    const ce = document.body.appendChild(document.createElement('div'));
    ce.setAttribute('contenteditable', 'true');
    Object.defineProperty(ce, 'isContentEditable', { value: true });
    press({ key: 'k' }, ce);
    expect(spy).not.toHaveBeenCalled();
  });

  it('ignores a target inside role=dialog', () => {
    const spy = vi.fn();
    setup(() => ({ k: spy }));
    const dlg = document.body.appendChild(document.createElement('div'));
    dlg.setAttribute('role', 'dialog');
    const btn = dlg.appendChild(document.createElement('button'));
    press({ key: 'k' }, btn);
    expect(spy).not.toHaveBeenCalled();
  });

  it('allows Shift for ?', () => {
    const spy = vi.fn();
    setup(() => ({ '?': spy }));
    press({ key: '?', shiftKey: true });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('leaves unbound keys alone', () => {
    setup(() => ({ k: vi.fn() }));
    expect(press({ key: 'x' }).defaultPrevented).toBe(false);
  });

  it('reads bindings on every press', () => {
    const a = vi.fn();
    const b = vi.fn();
    const which = ref(1);
    setup(() => ({ k: which.value === 1 ? a : b }));
    press({ key: 'k' });
    which.value = 2;
    press({ key: 'k' });
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('stops listening when the scope is stopped', () => {
    const spy = vi.fn();
    setup(() => ({ k: spy }));
    scope!.stop();
    press({ key: 'k' });
    expect(spy).not.toHaveBeenCalled();
  });
});
