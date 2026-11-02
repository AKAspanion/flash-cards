<template>
  <div class="view">
    <bar-top @click:left="goBack">
      <template #left-button>
        <v-icon
          color="primary"
          size="32"
        >
          mdi-arrow-left
        </v-icon>
      </template>
      <template #left-text>
        {{ atLastCard ? t('common.done') : t('common.home') }}
      </template>
      <template #center>
        <div class="text-center text-title-large text-uppercase text-truncate pa-4">
          {{ set?.title || t('add.set.notitle') }}
        </div>
      </template>
      <template #right>
        <div class="view__count text-title-small">
          {{ learned }}/{{ cards.length }}
        </div>
        <div class="text-label-medium text-uppercase">
          {{ t('common.learned') }}
        </div>
      </template>
    </bar-top>
    <group-card-flash
      v-if="set"
      v-model="cards"
      browse
      :color="set.color"
      :disabled="saving"
      :labels="setLabels"
      @focused="(index) => (focusedIndex = index)"
    />
    <v-progress-linear
      :aria-label="t('common.learned')"
      class="view__progress"
      :color="set?.color || 'primary'"
      height="4"
      location="bottom"
      :model-value="cards.length ? (learned / cards.length) * 100 : 0"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import BarTop from '@/components/BarTop.vue';
import GroupCardFlash from '@/components/GroupCardFlash.vue';
import type { CardSet, FlashCard } from '@/types';
import { useLibraryStore } from '@/stores/library';
import { useSessionStore } from '@/stores/session';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const library = useLibraryStore();
const session = useSessionStore();

const set = ref<CardSet | null>(null);
const cards = ref<FlashCard[]>([]);
const snapshot = ref('');
const focusedIndex = ref(0);
const saving = ref(false);

const learned = computed(() => cards.value.filter((c) => c.learned).length);
const atLastCard = computed(() => cards.value.length > 0 && focusedIndex.value >= cards.value.length - 1);
const setLabels = computed(() => library.labels.filter((l) => set.value?.labels.includes(l.docId)));
const dirty = computed(() => !!set.value && JSON.stringify(cards.value) !== snapshot.value);

watch(dirty, (value) => (session.unsavedChanges = value), { immediate: true });

watch(
  () => library.status,
  (status) => {
    if (status === 'error') {
      void router.replace('/home');
      return;
    }
    if (status !== 'ready' || set.value) {
      return;
    }
    const existing = library.findSet(String(route.params.id));
    if (!existing?.docId) {
      session.showSnack(t('toast.set-not-found'));
      void router.replace('/home');
      return;
    }
    set.value = existing;
    cards.value = existing.cards.map((c) => ({ ...c }));
    snapshot.value = JSON.stringify(cards.value);
  },
  { immediate: true },
);

function goBack() {
  // Progress is saved by the leave guard below, whichever way the user leaves.
  void router.push('/home');
}

async function saveProgress(): Promise<boolean> {
  if (!set.value || !session.online) {
    return false;
  }
  saving.value = true;
  const ok = await library.saveSet({ ...set.value, cards: cards.value });
  saving.value = false;
  if (ok) {
    snapshot.value = JSON.stringify(cards.value);
  }
  return ok;
}

onBeforeRouteLeave(async () => {
  if (!session.user || !dirty.value) {
    return true;
  }
  if (saving.value) {
    return false;
  }
  if (await saveProgress()) {
    return true;
  }
  return window.confirm(t('view.discard-confirm'));
});

onBeforeUnmount(() => {
  session.unsavedChanges = false;
});
</script>

<style scoped>
.view {
  min-height: 100vh;
}
.view__count {
  height: 64px;
  line-height: 64px;
}
.view__progress {
  position: fixed !important;
  bottom: 0;
  left: 0;
  z-index: 2;
}
</style>
