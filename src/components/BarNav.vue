<template>
  <div
    v-if="visible"
    class="floating-fab floating-fab--right"
  >
    <v-speed-dial
      v-model="open"
      location="top center"
      transition="slide-y-reverse-transition"
    >
      <template #activator="{ props: activator }">
        <v-btn
          v-bind="activator"
          :aria-label="t('common.menu')"
          color="primary"
          :disabled="session.loading"
          :elevation="session.loading ? 0 : 4"
          icon
          size="x-large"
        >
          <v-icon :class="open ? 'fab-icon fab-icon--open' : 'fab-icon'">
            mdi-chevron-left
          </v-icon>
        </v-btn>
      </template>
      <v-btn
        v-for="action in actions"
        :key="action.path"
        :aria-label="action.title"
        color="accent"
        icon
        size="small"
        @click="router.push(action.path)"
      >
        <v-icon size="small">
          {{ action.icon }}
        </v-icon>
        <span class="fab-tooltip">{{ action.title }}</span>
      </v-btn>
    </v-speed-dial>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useSessionStore } from '@/stores/session';

const HIDDEN_ON = ['login', 'profile', 'view'];

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const session = useSessionStore();
const open = ref(false);

const visible = computed(() => !!route.name && !HIDDEN_ON.includes(String(route.name)) && !!session.user);
const actions = computed(() => [
  { title: t('common.home'), icon: 'mdi-home', path: '/home' },
  { title: t('home.set.add'), icon: 'mdi-card-plus', path: '/add' },
]);

watch(
  () => route.fullPath,
  () => {
    open.value = false;
  },
);
</script>

<style scoped>
.fab-icon {
  transform: rotate(40deg);
  transition: transform 0.2s cubic-bezier(1, 0, 0, 1);
}
.fab-icon--open {
  transform: rotate(90deg);
}
.fab-tooltip {
  position: absolute;
  right: calc(100% + 8px);
  padding: 4px 8px;
  border-radius: 4px;
  color: white;
  white-space: nowrap;
  text-transform: none;
  background: rgba(0, 0, 0, 0.56);
}
</style>
