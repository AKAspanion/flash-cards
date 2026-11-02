import pluginVue from 'eslint-plugin-vue';
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript';

export default defineConfigWithVueTs(
  {
    ignores: ['dist/**', 'dist-e2e/**', 'playwright-report/**', 'test-results/**', 'dev-dist/**', 'coverage/**', 'node_modules/**', '.firebase/**'],
  },
  pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,
  {
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },
);
