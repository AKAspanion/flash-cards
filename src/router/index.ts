import Vue from 'vue';
import VueRouter from 'vue-router';

import FirebaseWeb from '@/firebase';
const firebase = new FirebaseWeb();

import store from '@/store';

Vue.use(VueRouter);

const routes = [
  {
    path: '/',
    name: 'root',
    component: () => import('@/views/Home.vue'),
    meta: {
      requireAuth: true,
      index: 1,
    },
  },
  {
    path: '/home',
    name: 'home',
    component: () => import('@/views/Home.vue'),
    meta: {
      requireAuth: true,
      index: 2,
    },
  },
  {
    path: '/add',
    name: 'add',
    component: () => import('@/views/Add.vue'),
    meta: {
      requireAuth: true,
      index: 3,
    },
  },

  {
    path: '/:id/edit',
    name: 'edit',
    component: () => import('@/views/Add.vue'),
    meta: {
      requireAuth: true,
      index: 4,
    },
  },
  {
    path: '/folder',
    name: 'folder',
    component: () => import('@/views/Folder.vue'),
    meta: {
      requireAuth: true,
      index: 5,
    },
  },
  {
    path: '/bin',
    name: 'bin',
    component: () => import('@/views/Bin.vue'),
    meta: {
      requireAuth: true,
      index: 5,
    },
  },
  {
    path: '/:id/view',
    name: 'view',
    component: () => import('@/views/View.vue'),
    meta: {
      requireAuth: true,
      index: 5,
    },
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('@/views/Profile.vue'),
    meta: {
      requireAuth: true,
      index: 6,
    },
  },
  {
    path: '/info',
    name: 'info',
    component: () => import('@/views/Info.vue'),
    meta: {
      requireAuth: true,
      index: 7,
    },
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/Settings.vue'),
    meta: {
      requireAuth: true,
      index: 8,
    },
  },
  {
    path: '*',
    name: 'notfound',
    redirect: '/',
    component: () => import('@/views/NotFound.vue'),
    meta: {
      requireAuth: true,
      index: 9,
    },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/Login.vue'),
  },
];

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes,
});

router.beforeEach(async (to, from, next) => {
  store.dispatch('AUTH_LOADING', true);
  let user: any = null;
  try {
    if (!firebase.isAppInitialized()) {
      firebase.initializeFirebase();
    }
    user = await firebase.getAuthUser();
  } catch (err) {
    console.error(err);
    store.dispatch('AUTH_LOADING', false);
    store.dispatch('SHOW_SNACK', (err as Error).message);
    next(false);
    return;
  }
  store.dispatch('AUTH_LOADING', false);

  if (user) {
    store.dispatch('SET_USER', user);
    store.dispatch('LOGIN');
  } else {
    store.dispatch('UNSET_USER');
    store.dispatch('LOGOUT');
  }

  const requireAuth = to.matched.some((record: any) => record.meta.requireAuth);
  if (requireAuth && !user) {
    next({ path: '/login', query: { redirect: to.fullPath } });
  } else if (!requireAuth && user) {
    next({ path: (to.query.redirect as string) || '/home' });
  } else {
    next();
  }
});

export default router;
