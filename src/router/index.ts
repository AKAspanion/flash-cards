import { createRouter, createWebHistory, type RouteLocationRaw } from 'vue-router';
import { getAuthUser, onUserChanged } from '@/services/firebase';
import { useSessionStore } from '@/stores/session';
import { useLibraryStore } from '@/stores/library';
import { useStatsStore } from '@/stores/stats';
import { loadFresh } from '@/utils/freshLoad';

declare module 'vue-router' {
  interface RouteMeta {
    requireAuth?: boolean;
    public?: boolean;
  }
}

const routes = [
  { path: '/', redirect: '/home' },
  { path: '/home', name: 'home', component: () => import('@/views/Home.vue'), meta: { requireAuth: true } },
  { path: '/add', name: 'add', component: () => import('@/views/Add.vue'), meta: { requireAuth: true } },
  { path: '/:id/edit', name: 'edit', component: () => import('@/views/Add.vue'), meta: { requireAuth: true } },
  { path: '/:id/view', name: 'view', component: () => import('@/views/View.vue'), meta: { requireAuth: true } },
  { path: '/due', name: 'due', component: () => import('@/views/Due.vue'), meta: { requireAuth: true } },
  { path: '/bin', name: 'bin', component: () => import('@/views/Bin.vue'), meta: { requireAuth: true } },
  { path: '/profile', name: 'profile', component: () => import('@/views/Profile.vue'), meta: { requireAuth: true } },
  { path: '/info', name: 'info', component: () => import('@/views/Info.vue'), meta: { requireAuth: true } },
  { path: '/settings', name: 'settings', component: () => import('@/views/Settings.vue'), meta: { requireAuth: true } },
  { path: '/stats', name: 'stats', component: () => import('@/views/Stats.vue'), meta: { requireAuth: true } },
  { path: '/privacy', name: 'privacy', component: () => import('@/views/Privacy.vue'), meta: { public: true } },
  { path: '/delete-account', name: 'delete-account', component: () => import('@/views/Deletion.vue'), meta: { public: true } },
  { path: '/login', name: 'login', component: () => import('@/views/Login.vue') },
  { path: '/s/:shareId', name: 'shared', component: () => import('@/views/Shared.vue'), meta: { public: true } },
  { path: '/:pathMatch(.*)*', redirect: '/home' },
];

/** Only same-app paths are allowed as a post-login redirect. */
export function safeRedirect(value: unknown): string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/home';
}

/** Where to send a navigation given the signed-in state; true = let it through. */
export function authRedirect(
  to: { fullPath: string; meta: { requireAuth?: boolean; public?: boolean }; query: Record<string, unknown> },
  signedIn: boolean,
): true | RouteLocationRaw {
  if (to.meta.public) {
    return true;
  }
  if (to.meta.requireAuth && !signedIn) {
    return { path: '/login', query: { redirect: to.fullPath } };
  }
  if (!to.meta.requireAuth && signedIn) {
    return safeRedirect(to.query.redirect);
  }
  return true;
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

let watchingAuth = false;

// Sign-in/sign-out can also happen outside navigation (another tab, token revoked):
// swap the loaded library and move to the right page when the user changes.
function watchAuthChanges() {
  if (watchingAuth) {
    return;
  }
  watchingAuth = true;
  onUserChanged((user) => {
    const session = useSessionStore();
    if ((user?.uid ?? null) === (session.user?.uid ?? null)) {
      return;
    }
    session.setUser(user);
    const library = useLibraryStore();
    library.reset();
    useStatsStore().reset();
    if (!user) {
      session.unsavedChanges = false;
      // A sign-out or account deletion in another tab deletes the shared cache, which stops this
      // tab's Firestore for good: a new page starts a working one. A tab signing out itself loads
      // that page on its own once its cache is cleared, so the reload mustn't cut that short.
      if (!session.signingOut) {
        loadFresh('/login');
      }
      return;
    }
    void library.load();
    // The login page navigates on its own after a successful sign-in.
    if (router.currentRoute.value.name !== 'login') {
      void router.replace('/home');
    }
  });
}

router.beforeEach(async (to) => {
  const session = useSessionStore();
  session.authLoading = true;
  try {
    const user = await getAuthUser();
    session.setUser(user);
    watchAuthChanges();
  } catch (err) {
    session.showError(err);
    return false;
  } finally {
    session.authLoading = false;
  }

  const library = useLibraryStore();
  if (session.user) {
    void library.load();
  } else {
    library.reset();
    useStatsStore().reset();
  }
  return authRedirect(to, !!session.user);
});

router.onError((err, to) => {
  if (/dynamically imported module|Importing a module script failed/i.test(String(err?.message))) {
    window.location.assign(to.fullPath);
    return;
  }
  useSessionStore().showError(err);
});

export default router;
