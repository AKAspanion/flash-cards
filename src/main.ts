import Vue from 'vue';
import App from './App.vue';
import router from './router';
import store from './store';
import vuetify from './plugins/vuetify/vuetify';
import i18n from './plugins/i18n/i18n';

import './registerServiceWorker';

Vue.config.productionTip = false;

new Vue({
  vuetify,
  router,
  store,
  i18n,
  render: (h) => h(App),
}).$mount('#app');
