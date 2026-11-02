import '@mdi/font/css/materialdesignicons.css';
import 'vuetify/styles';
import { createVuetify } from 'vuetify';

const brand = {
  primary: '#E91E63',
  secondary: '#9C27B0',
  accent: '#673AB7',
  error: '#F44336',
  warning: '#FF9800',
  info: '#3F51B5',
  success: '#4CAF50',
};

export default createVuetify({
  theme: {
    // Vuetify 4 defaults to "system"; the app has its own light/dark setting.
    defaultTheme: 'light',
    themes: {
      light: { dark: false, colors: { ...brand, surface: '#FFFFFF', background: '#FFFFFF', 'surface-light': '#E0E0E0' } },
      dark: { dark: true, colors: { ...brand, surface: '#121212', background: '#121212', 'surface-light': '#212121' } },
    },
  },
});
