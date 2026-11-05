import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import vuetify from '@/plugins/vuetify';
import i18n from '@/plugins/i18n';
import { useSessionStore } from '@/stores/session';
import GroupCardFlash from '@/components/GroupCardFlash.vue';
import type { FlashCard } from '@/types';

const FLIPPED = 'flash-card__inner--flipped';
const ITEM_WIDTH = 200;

function makeCards(learnedFirst = false): FlashCard[] {
  return [
    { id: 'a', front: 'A front', back: 'A back', learned: learnedFirst, date: '2026-01-01' },
    { id: 'b', front: 'B front', back: 'B back', learned: false, date: '2026-01-01' },
    { id: 'c', front: 'C front', back: 'C back', learned: false, date: '2026-01-01' },
  ];
}

let wrapper: VueWrapper | null = null;

function mountSlider(props: Record<string, unknown> = {}) {
  const pinia = createPinia();
  setActivePinia(pinia);
  wrapper = mount(GroupCardFlash, {
    props: { modelValue: makeCards(), ...props },
    global: { plugins: [vuetify, i18n, pinia] },
    attachTo: document.body,
  });
  return wrapper;
}

function inners() {
  return wrapper!.findAll('.flash-card__inner').map((w) => w.classes(FLIPPED));
}

function exposed() {
  return wrapper!.vm as unknown as {
    next(): void;
    prev(): void;
    goTo(index: number): void;
    flipFocused(): void;
  };
}

/** jsdom has no layout: items are 200px wide, laid out from 28px, in a 400px container. */
function stubLayout(container: HTMLElement) {
  const items = Array.from(container.querySelectorAll('.card-slider__item'));
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    if (this === container) {
      return { left: 0, width: 400 } as DOMRect;
    }
    const index = items.indexOf(this);
    return { left: 28 + index * ITEM_WIDTH, width: ITEM_WIDTH } as DOMRect;
  });
  const scrollBy = vi.fn();
  const scrollTo = vi.fn();
  container.scrollBy = scrollBy;
  container.scrollTo = scrollTo;
  return { scrollBy, scrollTo };
}

beforeEach(() => {
  // Vuetify's layout code needs ResizeObserver, which jsdom lacks.
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('GroupCardFlash flipping', () => {
  it('flips only the focused (first) card on flipFocused()', async () => {
    mountSlider();
    expect(inners()).toEqual([false, false, false]);
    exposed().flipFocused();
    await wrapper!.vm.$nextTick();
    expect(inners()).toEqual([true, false, false]);
  });

  it('starts every card on its back with reverse, and flipFocused() turns the first back', async () => {
    mountSlider({ reverse: true });
    expect(inners()).toEqual([true, true, true]);
    exposed().flipFocused();
    await wrapper!.vm.$nextTick();
    expect(inners()).toEqual([false, true, true]);
  });

  it('resets every card to its back when reverse changes to true', async () => {
    mountSlider({ reverse: false });
    exposed().flipFocused();
    await wrapper!.vm.$nextTick();
    expect(inners()).toEqual([true, false, false]);
    await wrapper!.setProps({ reverse: true });
    expect(inners()).toEqual([true, true, true]);
  });

  it('marks a learned card not learned when peeking online in browse mode', () => {
    mountSlider({ browse: true, modelValue: makeCards(true) });
    useSessionStore().online = true;
    exposed().flipFocused();
    const events = wrapper!.emitted('update:modelValue');
    expect(events).toHaveLength(1);
    const cards = events![0][0] as FlashCard[];
    expect(cards[0].learned).toBe(false);
  });
});

describe('GroupCardFlash navigation', () => {
  it('next() scrolls to the second card, prev() on the first card does nothing', () => {
    mountSlider();
    const { scrollTo } = stubLayout(wrapper!.element as HTMLElement);
    exposed().prev();
    expect(scrollTo).not.toHaveBeenCalled();
    exposed().next();
    // scrollLeft 0 + (28 + 200) - 0 - (400 - 200) / 2
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ left: 128 }));
  });

  it('next() twice with no scroll event in between focuses the third card and emits each step', async () => {
    mountSlider();
    const { scrollTo } = stubLayout(wrapper!.element as HTMLElement);
    exposed().next();
    exposed().next();
    exposed().next();
    expect(wrapper!.emitted('focused')).toEqual([[1], [2]]);
    expect(scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ left: 328 }));
    exposed().flipFocused();
    await wrapper!.vm.$nextTick();
    expect(inners()).toEqual([false, false, true]);
  });

  it('goTo(5) with three cards scrolls to the third card', () => {
    mountSlider();
    const { scrollTo } = stubLayout(wrapper!.element as HTMLElement);
    exposed().goTo(5);
    // scrollLeft 0 + (28 + 2 * 200) - 0 - (400 - 200) / 2
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ left: 328 }));
  });

  it('emits focused with the index when the container scrolls to the second card', async () => {
    mountSlider();
    const el = wrapper!.element as HTMLElement;
    stubLayout(el);
    Object.defineProperty(el, 'scrollLeft', { value: ITEM_WIDTH, configurable: true });
    await wrapper!.trigger('scroll');
    expect(wrapper!.emitted('focused')).toEqual([[1]]);
  });
});
