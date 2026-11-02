<template>
  <v-app>
    <v-progress-linear
      v-if="session.loading"
      class="top-loader"
      color="primary"
      height="4"
      indeterminate
    />
    <v-snackbar
      :model-value="!session.online"
      class="network-snack"
      color="primary"
      location="top"
      :timeout="-1"
    >
      <v-icon start>
        mdi-wifi-off
      </v-icon>
      {{ t('common.offline') }}
    </v-snackbar>
    <v-snackbar
      v-model="session.snack.show"
      location="bottom"
      min-height="68"
      :timeout="session.snack.onAction ? 7000 : 4000"
    >
      {{ session.snack.text }}
      <template #actions>
        <v-btn
          variant="text"
          @click="onSnackAction"
        >
          {{ session.snack.actionText || t('common.close') }}
        </v-btn>
      </template>
    </v-snackbar>
    <v-main>
      <router-view v-slot="{ Component, route }">
        <transition
          name="slide-left"
          mode="out-in"
        >
          <component
            :is="Component"
            :key="route.fullPath"
          />
        </transition>
      </router-view>
    </v-main>
    <bar-nav />
  </v-app>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useTheme } from 'vuetify';
import BarNav from '@/components/BarNav.vue';
import { useSessionStore } from '@/stores/session';
import { usePrefsStore } from '@/stores/prefs';

const { t, locale } = useI18n();
const theme = useTheme();
const session = useSessionStore();
const prefs = usePrefsStore();

watch(
  () => prefs.lang,
  (lang) => {
    locale.value = lang;
    document.documentElement.lang = lang;
  },
  { immediate: true },
);
watch(
  () => prefs.dark,
  (dark) => theme.change(dark ? 'dark' : 'light'),
  { immediate: true },
);

function onSnackAction() {
  const action = session.snack.onAction;
  session.snack.show = false;
  action?.();
}

function updateOnline() {
  session.online = navigator.onLine;
}

onMounted(() => {
  window.addEventListener('online', updateOnline);
  window.addEventListener('offline', updateOnline);
  updateOnline();
});
onBeforeUnmount(() => {
  window.removeEventListener('online', updateOnline);
  window.removeEventListener('offline', updateOnline);
});
</script>

<style>
.top-loader {
  position: fixed !important;
  top: 0;
  left: 0;
  z-index: 2000;
}
.slide-left-enter-active,
.slide-left-leave-active {
  transition:
    opacity 0.2s cubic-bezier(0.55, 0, 0.1, 1),
    transform 0.2s cubic-bezier(0.55, 0, 0.1, 1);
}
.slide-left-enter-from {
  opacity: 0;
  transform: translate(2em, 0);
}
.slide-left-leave-to {
  opacity: 0;
  transform: translate(-2em, 0);
}
</style>
