<template>
  <div class="due">
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
        {{ t('common.home') }}
      </template>
      <template #center>
        <div class="text-center text-title-large text-uppercase text-truncate pa-4">
          {{ currentSet?.title || t('due.study-now') }}
        </div>
      </template>
    </bar-top>
    <div
      v-if="currentSet && currentCard"
      class="due__card"
    >
      <card-flash
        :key="position"
        ref="cardRef"
        browse
        :color="currentSet.color"
        :disabled="saving"
        :model-value="currentCard"
        :number="position + 1"
        rating
        @rate="rate"
      />
    </div>
    <container-empty
      v-else-if="library.status === 'ready'"
      icon="mdi-check-all"
      :subtitle="t('empty.due.subtitle')"
      :title="t('empty.due.title')"
    />
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
import { onBeforeRouteLeave, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import BarTop from '@/components/BarTop.vue';
import CardFlash from '@/components/CardFlash.vue';
import ContainerEmpty from '@/components/ContainerEmpty.vue';
import StudySummaryDialog from '@/components/StudySummaryDialog.vue';
import { useStudyShortcuts } from '@/composables/useStudyShortcuts';
import type { CardSet, FlashCard } from '@/types';
import { localDate } from '@/utils/dates';
import { dueQueue, schedule, type DueEntry, type Rating } from '@/utils/srs';
import { useLibraryStore } from '@/stores/library';
import { useSessionStore } from '@/stores/session';

const KEY_RATINGS: Record<string, Rating> = { '1': 'again', '2': 'hard', '3': 'good', '4': 'easy' };

const { t } = useI18n();
const router = useRouter();
const library = useLibraryStore();
const session = useSessionStore();

/** Working copy of each set the session touches, keyed by set id. */
const sets = ref(new Map<string, CardSet>());
/** Set ids rated since their last successful save. */
const touched = ref(new Set<string>());
/** The entries of this session; the summary counts over them. */
const entries = ref<DueEntry[]>([]);
/** The order cards are shown in: the entries, then each "again" card once more. */
const queue = ref<DueEntry[]>([]);
const requeued = new Set<string>();
const position = ref(0);
const started = ref(false);
const saving = ref(false);
const summaryOpen = ref(false);
const summary = ref<{ known: number; total: number; missed: DueEntry[] }>({ known: 0, total: 0, missed: [] });
const cardRef = ref<{ flip: () => void; rate: (rating: Rating) => boolean } | null>(null);

const entryKey = (e: DueEntry) => `${e.setId}\u0000${e.cardId}`;
const current = computed(() => queue.value[position.value]);
const currentSet = computed(() => (current.value ? sets.value.get(current.value.setId) : undefined));
const currentCard = computed(() => currentSet.value?.cards.find((c) => c.id === current.value?.cardId));
const dirty = computed(() => touched.value.size > 0);

watch(dirty, (value) => (session.unsavedChanges = value), { immediate: true });

function startSession(list: DueEntry[]) {
  for (const { setId } of list) {
    const existing = library.findSet(setId);
    if (existing && !sets.value.has(setId)) {
      sets.value.set(setId, { ...existing, cards: existing.cards.map((c) => ({ ...c })) });
    }
  }
  entries.value = list;
  queue.value = [...list];
  requeued.clear();
  position.value = 0;
  summaryOpen.value = false;
}

watch(
  () => library.status,
  (status) => {
    if (status === 'error') {
      void router.replace('/home');
      return;
    }
    if (status !== 'ready' || started.value) {
      return;
    }
    started.value = true;
    startSession(dueQueue(library.sets, localDate()));
  },
  { immediate: true },
);

function rate(rating: Rating) {
  const entry = current.value;
  const set = currentSet.value;
  if (!entry || !set || saving.value) {
    return;
  }
  const today = localDate();
  set.cards = set.cards.map((c: FlashCard) =>
    c.id === entry.cardId ? { ...c, srs: schedule(c.srs, rating, today), learned: rating !== 'again' } : c,
  );
  touched.value = new Set(touched.value).add(entry.setId);
  if (rating === 'again' && !requeued.has(entryKey(entry))) {
    requeued.add(entryKey(entry));
    queue.value = [...queue.value, entry];
  }
  if (position.value + 1 >= queue.value.length) {
    openSummary();
  }
  position.value++;
}

function openSummary() {
  const missed = entries.value.filter((e) => {
    const card = sets.value.get(e.setId)?.cards.find((c) => c.id === e.cardId);
    return !card?.learned;
  });
  summary.value = { known: entries.value.length - missed.length, total: entries.value.length, missed };
  summaryOpen.value = true;
}

function reviewMissed() {
  startSession(summary.value.missed);
}

useStudyShortcuts(() => {
  const map: Record<string, () => void> = {
    ' ': () => {
      if (!summaryOpen.value) cardRef.value?.flip();
    },
  };
  for (const [key, rating] of Object.entries(KEY_RATINGS)) {
    map[key] = () => {
      if (!summaryOpen.value) cardRef.value?.rate(rating);
    };
  }
  return map;
});

function goBack() {
  // Progress is saved by the leave guard below, whichever way the user leaves.
  void router.push('/home');
}

async function saveTouched(): Promise<boolean> {
  if (!session.online) {
    return false;
  }
  saving.value = true;
  try {
    for (const id of [...touched.value]) {
      const set = sets.value.get(id);
      if (!set || !(await library.saveSet({ ...set, studiedAt: new Date() }))) {
        return false;
      }
      const rest = new Set(touched.value);
      rest.delete(id);
      touched.value = rest;
    }
    return true;
  } finally {
    saving.value = false;
  }
}

onBeforeRouteLeave(async () => {
  if (!session.user || !dirty.value) {
    return true;
  }
  if (saving.value) {
    return false;
  }
  if (await saveTouched()) {
    return true;
  }
  return window.confirm(t('view.discard-confirm'));
});

onBeforeUnmount(() => {
  session.unsavedChanges = false;
});
</script>

<style scoped>
.due {
  min-height: 100vh;
}
.due__card {
  max-width: 900px;
  margin: 0 auto;
}
</style>
