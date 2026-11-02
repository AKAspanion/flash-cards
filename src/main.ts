import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import vuetify from './plugins/vuetify';
import i18n from './plugins/i18n';
import { setupPwaUpdates } from './pwa';
import './assets/style.css';

createApp(App).use(createPinia()).use(router).use(vuetify).use(i18n).mount('#app');

setupPwaUpdates();

// A tab opened before a deploy can ask for page chunks that no longer exist; reload to get the new build.
window.addEventListener('vite:preloadError', () => window.location.reload());
