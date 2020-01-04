import Vue from 'vue';
import Vuetify from 'vuetify';
import 'vuetify/dist/vuetify.min.css';
import '@mdi/font/css/materialdesignicons.css';

Vue.use(Vuetify);

export default new Vuetify({
    icons: {
        iconfont: 'mdi',
    },
    theme: {
        themes: {
            light: {
                primary: '#e91e63',
                secondary: '#9c27b0',
                accent: '#673ab7',
                error: '#f44336',
                warning: '#ff9800',
                info: '#3f51b5',
                success: '#4caf50',
            },
            dark: {
                primary: '#e91e63',
                secondary: '#9c27b0',
                accent: '#673ab7',
                error: '#f44336',
                warning: '#ff9800',
                info: '#3f51b5',
                success: '#4caf50',
            },
        },
    },
});
