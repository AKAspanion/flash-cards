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
    path: '/profile',
    name: 'profile',
    component: () => import('@/views/Profile.vue'),
    meta: {
      requireAuth: true,
      index: 6,
    },
  },
  {
    path: '*',
    name: 'notfound',
    redirect: '/',
    component: () => import('@/views/NotFound.vue'),
    meta: {
      requireAuth: true,
      index: 7,
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

router.beforeEach((to, from, next) => {
  if (!firebase.isAppInitialized()) {
    firebase.initializeFirebase();
  }
  store.dispatch('LOADING', true);
  firebase.authChangeListener((user: any) => {
    store.dispatch('LOADING', false);
    if (to.matched.some((record: any) => record.meta.requireAuth)) {
      if (!user) {
        store.dispatch('UNSET_USER');
        store.dispatch('LOGOUT');
        const nextObject: any = {
          path: '/login',
          redirect: from.fullPath,
        };
        next(nextObject);
      } else {
        store.dispatch('SET_USER', user);
        store.dispatch('LOGIN');
        next();
      }
    } else {
      if (localStorage.getItem('isLoggedIn') === 'true') {
        next({
          path: '/home',
        });
      } else {
        next();
      }
    }
  });
});

export default router;
