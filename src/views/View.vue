<template>
  <div class="view">
    <bar-top @click:left="onLeftClick">
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
      v-if="set && queuedCards.length"
      :key="queueKey"
      ref="slider"
      browse
      :color="set.color"
      :disabled="saving"
      :labels="setLabels"
      :model-value="queuedCards"
      :reverse="prefs.studyReverse"
      @focused="(index) => (focusedIndex = index)"
      @update:model-value="onQueueUpdate"
    />
    <container-empty
      v-else-if="set && cards.length && prefs.studyUnlearnedOnly"
      icon="mdi-check-all"
      :subtitle="t('empty.study.subtitle')"
      :title="t('empty.study.title')"
    />
    <v-progress-linear
      :aria-label="t('common.learned')"
      class="view__progress"
      :color="set?.color || 'primary'"
      height="4"
      location="bottom"
      :model-value="cards.length ? (learned / cards.length) * 100 : 0"
    />
    <option-panel :title="t('study.options')">
      <v-switch
        v-model="prefs.studyShuffle"
        color="primary"
        hide-details
        inset
        :label="t('study.shuffle')"
      />
      <v-switch
        v-model="prefs.studyUnlearnedOnly"
        color="primary"
        hide-details
        inset
        :label="t('study.unlearned-only')"
      />
      <v-switch
        v-model="prefs.studyReverse"
        color="primary"
        hide-details
        inset
        :label="t('study.reverse')"
      />
      <button
        v-ripple
        class="option-row option-row--action"
        :disabled="saving || !session.online || !cards.length"
        type="button"
        @click.stop="resetOpen = true"
      >
        <span class="option-row__label">{{ t('study.reset') }}</span>
        <v-icon color="primary">
          mdi-restore
        </v-icon>
      </button>
      <button
        v-ripple
        class="option-row option-row--action"
        type="button"
        @click.stop="shortcutsOpen = true"
      >
        <span class="option-row__label">{{ t('study.shortcuts.title') }}</span>
        <v-icon color="primary">
          mdi-keyboard
        </v-icon>
      </button>
    </option-panel>
    <v-dialog
      v-model="resetOpen"
      max-width="420"
    >
      <v-card class="pa-2">
        <v-card-title class="text-title-large">
          {{ t('study.reset') }}
        </v-card-title>
        <v-card-text>{{ t('study.reset-confirm') }}</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            @click="resetOpen = false"
          >
            {{ t('common.cancel') }}
          </v-btn>
          <v-btn
            color="primary"
            variant="text"
            @click="resetProgress"
          >
            {{ t('study.reset-action') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <study-shortcuts-dialog v-model="shortcutsOpen" />
    <study-summary-dialog
      v-model="summaryOpen"
      :known="summary.known"
      :missed="summary.missed.length"
      :total="summary.total"
      @home="goBack"
      @review-missed="reviewMissed"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import BarTop from '@/components/BarTop.vue';
import ContainerEmpty from '@/components/ContainerEmpty.vue';
import GroupCardFlash from '@/components/GroupCardFlash.vue';
import OptionPanel from '@/components/OptionPanel.vue';
import StudyShortcutsDialog from '@/components/StudyShortcutsDialog.vue';
import StudySummaryDialog from '@/components/StudySummaryDialog.vue';
import { useStudyShortcuts } from '@/composables/useStudyShortcuts';
import type { CardSet, FlashCard } from '@/types';
import { buildQueue, summarize } from '@/utils/studyQueue';
import { useLibraryStore } from '@/stores/library';
import { usePrefsStore } from '@/stores/prefs';
import { useSessionStore } from '@/stores/session';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const library = useLibraryStore();
const session = useSessionStore();
const prefs = usePrefsStore();

const set = ref<CardSet | null>(null);
const cards = ref<FlashCard[]>([]);
const snapshot = ref('');
const focusedIndex = ref(0);
const saving = ref(false);
const queue = ref<string[]>([]);
const queueKey = ref(0);
const resetOpen = ref(false);
const shortcutsOpen = ref(false);
const summaryOpen = ref(false);
const summary = ref<{ known: number; total: number; missed: string[] }>({ known: 0, total: 0, missed: [] });
const slider = ref<{ next: () => void; prev: () => void; flipFocused: () => void } | null>(null);

const learned = computed(() => cards.value.filter((c) => c.learned).length);
const queuedCards = computed(() => {
  const byId = new Map(cards.value.map((c) => [c.id, c]));
  return queue.value.map((id) => byId.get(id)).filter((c): c is FlashCard => !!c);
});
const atLastCard = computed(() => queue.value.length > 0 && focusedIndex.value >= queue.value.length - 1);
const setLabels = computed(() => library.labels.filter((l) => set.value?.labels.includes(l.docId)));
const dirty = computed(() => !!set.value && JSON.stringify(cards.value) !== snapshot.value);

/** Starts a session over `ids` (the whole set's queue by default) at card 1. */
function startQueue(ids = buildQueue(cards.value, { shuffle: prefs.studyShuffle, unlearnedOnly: prefs.studyUnlearnedOnly })) {
  queue.value = ids;
  focusedIndex.value = 0;
  queueKey.value++;
}

watch(() => [prefs.studyShuffle, prefs.studyUnlearnedOnly], () => startQueue());

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
    startQueue();
  },
  { immediate: true },
);

function openSummary() {
  summary.value = summarize(cards.value, queue.value);
  summaryOpen.value = true;
}

function onQueueUpdate(list: FlashCard[]) {
  const updated = new Map(list.map((c) => [c.id, c]));
  const lastId = queue.value[queue.value.length - 1];
  const wasLearned = cards.value.find((c) => c.id === lastId)?.learned;
  cards.value = cards.value.map((c) => updated.get(c.id) ?? c);
  // The tick button on the last queued card ends the session.
  if (lastId !== undefined && !wasLearned && updated.get(lastId)?.learned && atLastCard.value) {
    openSummary();
  }
}

function mark(learnedValue: boolean) {
  const id = queue.value[focusedIndex.value];
  if (!id || saving.value || !session.online) {
    return;
  }
  cards.value = cards.value.map((c) => (c.id === id ? { ...c, learned: learnedValue } : c));
  if (learnedValue) {
    if (atLastCard.value) {
      openSummary();
    } else {
      slider.value?.next();
    }
  }
}

function resetProgress() {
  resetOpen.value = false;
  cards.value = cards.value.map((c) => ({ ...c, learned: false }));
  startQueue();
}

function reviewMissed() {
  summaryOpen.value = false;
  startQueue(summary.value.missed);
}

useStudyShortcuts(() => ({
  ' ': () => slider.value?.flipFocused(),
  ArrowRight: () => slider.value?.next(),
  ArrowLeft: () => slider.value?.prev(),
  k: () => mark(true),
  K: () => mark(true),
  j: () => mark(false),
  J: () => mark(false),
  '?': () => (shortcutsOpen.value = true),
}));

function onLeftClick() {
  if (atLastCard.value) {
    openSummary();
  } else {
    goBack();
  }
}

function goBack() {
  // Progress is saved by the leave guard below, whichever way the user leaves.
  void router.push('/home');
}

async function saveProgress(): Promise<boolean> {
  if (!set.value || !session.online) {
    return false;
  }
  saving.value = true;
  const ok = await library.saveSet({ ...set.value, cards: cards.value, studiedAt: new Date() });
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
