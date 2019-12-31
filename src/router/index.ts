import Vue from 'vue';
import VueRouter from 'vue-router';

Vue.use(VueRouter);

const routes = [
  {
    path: '/',
    name: 'root',
    component: () => import('@/views/Home.vue'),
  },
  {
    path: '/home',
    name: 'home',
    component: () => import('@/views/Home.vue'),
  },
  {
    path: '/add',
    name: 'add',
    component: () => import('@/views/Add.vue'),
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
];

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes,
});

export default router;
