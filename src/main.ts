import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { useSessionStore } from './stores/session';
import vuetify from './plugins/vuetify';
import i18n from './plugins/i18n';
import { setupPwaUpdates } from './pwa';
import './assets/style.css';

const pinia = createPinia();
const app = createApp(App).use(pinia);

// Read a Google redirect's outcome once, before the first screen decides what to show.
void useSessionStore(pinia).loadRedirectOutcome();

app.use(router).use(vuetify).use(i18n).mount('#app');

setupPwaUpdates();

// A tab opened before a deploy can ask for page chunks that no longer exist; reload to get the new build.
window.addEventListener('vite:preloadError', () => window.location.reload());
