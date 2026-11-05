import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

const api = vi.hoisted(() => ({
  fetchUserStats: vi.fn(),
  addReviews: vi.fn(),
  saveDailyGoal: vi.fn(),
}));
vi.mock('@/services/firebase', () => api);

const { useStatsStore } = await import('@/stores/stats');
const { useSessionStore } = await import('@/stores/session');

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((res) => (resolve = res));
  return { promise, resolve };
}

const STATS = { goal: 50, days: { '2026-11-01': 3, '2026-11-02': 4 } };

describe('stats store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.resetAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 2, 12));
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => vi.useRealTimers());

  function signIn(uid: string | null) {
    useSessionStore().user = uid
      ? { uid, email: '', displayName: '', photoURL: '', creationTime: '', lastSignInTime: '', emailVerified: false }
      : null;
  }

  async function loaded() {
    signIn('alice');
    api.fetchUserStats.mockResolvedValue(STATS);
    const stats = useStatsStore();
    await stats.load();
    return stats;
  }

  it('loads the goal, today and the streaks', async () => {
    const stats = await loaded();
    expect(stats.goal).toBe(50);
    expect(stats.todayCount).toBe(4);
    expect(stats.streak).toBe(2);
    expect(stats.longestStreak).toBe(2);
    expect(stats.status).toBe('ready');
  });

  it('fetches once per user', async () => {
    const stats = await loaded();
    await stats.load();
    expect(api.fetchUserStats).toHaveBeenCalledTimes(1);
  });

  it("ignores a previous user's load that finishes after a user switch", async () => {
    const alice = deferred<typeof STATS>();
    api.fetchUserStats
      .mockReturnValueOnce(alice.promise)
      .mockResolvedValueOnce({ goal: 10, days: { '2026-11-02': 1 } });
    const stats = useStatsStore();
    signIn('alice');
    const first = stats.load();
    signIn('bob');
    await stats.load();
    alice.resolve(STATS);
    await first;
    expect(stats.goal).toBe(10);
    expect(stats.todayCount).toBe(1);
  });

  it('does nothing when signed out', async () => {
    signIn(null);
    const stats = useStatsStore();
    await stats.load();
    expect(api.fetchUserStats).not.toHaveBeenCalled();
    expect(stats.status).toBe('idle');
  });

  it('shows the load error when the fetch fails', async () => {
    signIn('alice');
    api.fetchUserStats.mockRejectedValue(new Error(''));
    const stats = useStatsStore();
    await stats.load();
    expect(stats.status).toBe('error');
    expect(useSessionStore().snack.text).toBe('Error getting your flashcards. Please try later!');
  });

  it('adds reviews to today', async () => {
    const stats = await loaded();
    api.addReviews.mockResolvedValue(undefined);
    expect(await stats.recordReviews(3)).toBe(true);
    expect(api.addReviews).toHaveBeenCalledWith('2026-11-02', 3);
    expect(stats.todayCount).toBe(7);
  });

  it('keeps the counts and shows the stats snack when the write fails', async () => {
    const stats = await loaded();
    api.addReviews.mockRejectedValue(new Error('offline'));
    expect(await stats.recordReviews(3)).toBe(false);
    expect(stats.todayCount).toBe(4);
    expect(useSessionStore().snack.text).toBe("Couldn't update your stats. Your progress is saved.");
  });

  it('offline, reviews count at once without waiting for the server', async () => {
    const stats = await loaded();
    useSessionStore().online = false;
    api.addReviews.mockReturnValue(new Promise(() => {}));
    expect(await stats.recordReviews(5)).toBe(true);
    expect(stats.todayCount).toBe(9);
    expect(useSessionStore().snack.text).toBe("Saved on this device. It will sync when you're back online.");
  });

  it('reviews waiting for the server count as done the moment the device goes offline', async () => {
    const stats = await loaded();
    api.addReviews.mockReturnValue(new Promise(() => {}));
    api.saveDailyGoal.mockReturnValue(new Promise(() => {}));
    let reviewsDone = false;
    let goalDone = false;
    void stats.recordReviews(5).then((ok) => (reviewsDone = ok));
    void stats.setGoal(100).then((ok) => (goalDone = ok));
    await Promise.resolve();

    useSessionStore().online = false;
    await vi.waitFor(() => expect(reviewsDone && goalDone).toBe(true), { timeout: 200 });
    expect(stats.todayCount).toBe(9);
    expect(stats.goal).toBe(100);
    expect(useSessionStore().snack.text).toBe("Saved on this device. It will sync when you're back online.");
  });

  it('offline, reviews the server later refuses show the stats snack and reload', async () => {
    const stats = await loaded();
    useSessionStore().online = false;
    let refuse!: (err: unknown) => void;
    api.addReviews.mockReturnValue(new Promise((_, reject) => (refuse = reject)));
    await stats.recordReviews(5);

    refuse(Object.assign(new Error(''), { code: 'permission-denied' }));
    await vi.waitFor(() => expect(api.fetchUserStats).toHaveBeenCalledTimes(2));
    expect(useSessionStore().snack.text).toBe("Couldn't update your stats. Your progress is saved.");
    await vi.waitFor(() => expect(stats.todayCount).toBe(4));
  });

  it('offline, a goal is saved at once and a later refusal reloads', async () => {
    const stats = await loaded();
    useSessionStore().online = false;
    let refuse!: (err: unknown) => void;
    api.saveDailyGoal.mockReturnValue(new Promise((_, reject) => (refuse = reject)));
    expect(await stats.setGoal(100)).toBe(true);
    expect(stats.goal).toBe(100);

    refuse(Object.assign(new Error(''), { code: 'permission-denied' }));
    await vi.waitFor(() => expect(api.fetchUserStats).toHaveBeenCalledTimes(2));
    expect(useSessionStore().snack.text).toBe('Could not save. Please try again.');
    await vi.waitFor(() => expect(stats.goal).toBe(50));
  });

  it('writes nothing for a count of zero', async () => {
    const stats = await loaded();
    expect(await stats.recordReviews(0)).toBe(true);
    expect(api.addReviews).not.toHaveBeenCalled();
  });

  it('resets everything and refetches after reset', async () => {
    const stats = await loaded();
    stats.reset();
    expect(stats.goal).toBe(20);
    expect(stats.todayCount).toBe(0);
    expect(stats.days).toEqual({});
    expect(stats.status).toBe('idle');
    await stats.load();
    expect(api.fetchUserStats).toHaveBeenCalledTimes(2);
  });

  it('saves a goal from the allowed list and refuses others', async () => {
    const stats = await loaded();
    api.saveDailyGoal.mockResolvedValue(undefined);
    expect(await stats.setGoal(100)).toBe(true);
    expect(api.saveDailyGoal).toHaveBeenCalledWith(100);
    expect(stats.goal).toBe(100);

    api.saveDailyGoal.mockClear();
    expect(await stats.setGoal(30)).toBe(false);
    expect(api.saveDailyGoal).not.toHaveBeenCalled();

    api.saveDailyGoal.mockRejectedValue(new Error(''));
    expect(await stats.setGoal(10)).toBe(false);
    expect(stats.goal).toBe(100);
  });
});
