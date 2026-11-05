import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import vuetify from '@/plugins/vuetify';
import i18n from '@/plugins/i18n';
import { useLibraryStore } from '@/stores/library';
import { usePrefsStore } from '@/stores/prefs';
import { useStatsStore } from '@/stores/stats';
import Stats from '@/views/Stats.vue';

vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }));

let wrapper: VueWrapper | null = null;

function mountStats(prepare: (stats: ReturnType<typeof useStatsStore>) => void) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const stats = useStatsStore();
  const library = useLibraryStore();
  vi.spyOn(library, 'load').mockResolvedValue();
  const load = vi.spyOn(stats, 'load').mockResolvedValue();
  prepare(stats);
  wrapper = mount(Stats, { global: { plugins: [vuetify, i18n, pinia] }, attachTo: document.body });
  return { load };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 2, 12));
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  vi.useRealTimers();
});

describe('Stats', () => {
  it('shows the load-error state and retries by loading again', async () => {
    const { load } = mountStats((stats) => (stats.status = 'error'));
    expect(wrapper!.text()).toContain("Couldn't load your flashcards");
    expect(wrapper!.findAll('[role="img"]')).toHaveLength(0);
    load.mockClear();
    const retry = wrapper!.findAll('button').find((b) => b.text() === 'Retry');
    expect(retry).toBeTruthy();
    await retry!.trigger('click');
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('shows 30 bars named by count and date, and the figures', () => {
    mountStats((stats) => {
      stats.status = 'ready';
      stats.days = { '2026-11-01': 2, '2026-11-02': 3 };
    });
    const bars = wrapper!.findAll('[role="img"]').map((b) => b.attributes('aria-label'));
    expect(bars).toHaveLength(30);
    expect(bars.slice(-2)).toEqual(['2 cards on Nov 1, 2026', '3 cards on Nov 2, 2026']);
    expect(wrapper!.text()).toMatch(/5\s*Cards reviewed/);
    expect(wrapper!.text()).toMatch(/2\s*Current streak/);
  });

  it('uses the singular form for one card', () => {
    mountStats((stats) => {
      stats.status = 'ready';
      stats.days = { '2026-11-01': 1 };
    });
    const bars = wrapper!.findAll('[role="img"]').map((b) => b.attributes('aria-label'));
    expect(bars[28]).toBe('1 card on Nov 1, 2026');
  });

  it('writes bar dates in the app language', () => {
    const hindi = new Intl.DateTimeFormat('hi', { dateStyle: 'medium' }).format(new Date(2026, 10, 2));
    mountStats((stats) => {
      stats.status = 'ready';
      usePrefsStore().lang = 'hi';
    });
    expect(hindi).not.toBe('Nov 2, 2026');
    const last = wrapper!.findAll('[role="img"]').at(-1)!.attributes('aria-label');
    expect(last).toContain(hindi);
    expect(last).not.toContain('Nov');
  });
});
