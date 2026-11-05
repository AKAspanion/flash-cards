import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import vuetify from '@/plugins/vuetify';
import i18n from '@/plugins/i18n';
import { useSessionStore } from '@/stores/session';
import CardFlash from '@/components/CardFlash.vue';
import type { FlashCard } from '@/types';
import type { Rating } from '@/utils/srs';

const LABELS = ['Again', 'Hard', 'Good', 'Easy'];

const card: FlashCard = { id: 'a', front: 'A front', back: 'A back', learned: false, date: '2026-01-01' };

let wrapper: VueWrapper | null = null;

function mountCard(props: Record<string, unknown> = {}) {
  const pinia = createPinia();
  setActivePinia(pinia);
  wrapper = mount(CardFlash, {
    props: { modelValue: card, number: 1, ...props },
    global: { plugins: [vuetify, i18n, pinia] },
    attachTo: document.body,
  });
  return wrapper;
}

function exposed() {
  return wrapper!.vm as unknown as { flip(): void; rate(rating: Rating): boolean };
}

function ratingButtons() {
  return wrapper!.findAll('button').filter((b) => LABELS.includes(b.text()));
}

beforeEach(() => {
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
  vi.unstubAllGlobals();
});

describe('CardFlash rating row', () => {
  it('hides the rating buttons until the card is flipped, then shows all four in order', async () => {
    mountCard({ browse: true, rating: true });
    expect(ratingButtons()).toHaveLength(0);
    exposed().flip();
    await wrapper!.vm.$nextTick();
    expect(ratingButtons().map((b) => b.text())).toEqual(LABELS);
  });

  it('with reverse, hides the row on mount and shows it after one flip', async () => {
    mountCard({ browse: true, rating: true, reverse: true });
    expect(ratingButtons()).toHaveLength(0);
    exposed().flip();
    await wrapper!.vm.$nextTick();
    expect(ratingButtons().map((b) => b.text())).toEqual(LABELS);
  });

  it('emits rate once with the rating and no update:modelValue when a button is clicked', async () => {
    mountCard({ browse: true, rating: true });
    exposed().flip();
    await wrapper!.vm.$nextTick();
    await ratingButtons()[2].trigger('click');
    expect(wrapper!.emitted('rate')).toEqual([['good']]);
    expect(wrapper!.emitted('update:modelValue')).toBeUndefined();
  });

  it('rate() returns false and emits nothing before the card is revealed, true and emits after', async () => {
    mountCard({ browse: true, rating: true });
    expect(exposed().rate('easy')).toBe(false);
    expect(wrapper!.emitted('rate')).toBeUndefined();
    exposed().flip();
    await wrapper!.vm.$nextTick();
    expect(exposed().rate('easy')).toBe(true);
    expect(wrapper!.emitted('rate')).toEqual([['easy']]);
  });

  it('renders no rating buttons after a flip when rating is off', async () => {
    mountCard({ browse: true });
    exposed().flip();
    await wrapper!.vm.$nextTick();
    expect(ratingButtons()).toHaveLength(0);
  });
});

describe('CardFlash flipping', () => {
  it('does not emit update:modelValue when a learned card is flipped online in browse mode', () => {
    mountCard({ browse: true, modelValue: { ...card, learned: true } });
    useSessionStore().online = true;
    exposed().flip();
    expect(wrapper!.emitted('update:modelValue')).toBeUndefined();
  });
});
