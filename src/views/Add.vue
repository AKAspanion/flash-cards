<template>
  <div class="add">
    <bar-top
      @click:left="goBack"
      @click:right="optionsPanel?.toggle()"
    >
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
        <div class="d-flex align-center justify-center">
          <v-scale-transition origin="center center">
            <v-icon
              v-if="draft.fav"
              class="mr-1"
              color="yellow"
            >
              mdi-star
            </v-icon>
          </v-scale-transition>
          <v-text-field
            v-if="titleEdit"
            v-model="draft.title"
            autofocus
            class="add__title-field"
            density="compact"
            hide-details
            :aria-label="t('add.set.title')"
            :placeholder="t('add.set.notitle')"
            rounded="xl"
            variant="outlined"
            @blur="titleEdit = false"
            @keyup.enter="titleEdit = false"
          >
            <template #append-inner>
              <v-icon @click="titleEdit = false">
                mdi-check
              </v-icon>
            </template>
          </v-text-field>
          <button
            v-else
            class="add__title text-title-large text-uppercase py-4"
            type="button"
            @click="titleEdit = true"
          >
            {{ draft.title || t('add.set.notitle') }}
          </button>
        </div>
      </template>
      <template #right-button>
        <v-icon
          color="primary"
          size="32"
        >
          mdi-dots-vertical
        </v-icon>
      </template>
      <template #right-text>
        {{ t('common.options') }}
      </template>
    </bar-top>

    <container-empty
      v-if="!draft.cards.length"
      icon="mdi-card-plus"
      style="height: calc(100vh - 246px)"
      :subtitle="t('empty.add.subtitle')"
      :title="t('empty.add.title')"
    />
    <group-card-flash
      ref="cardGroup"
      v-model="draft.cards"
      :color="draft.color"
      :disabled="saving"
      :labels="setLabels"
      @delete="onCardDelete"
      @focused="(index) => (focusedIndex = index)"
    />

    <btn-action
      color="primary"
      :disabled="saving"
      @click="addCard"
    >
      {{ t('add.card') }}
    </btn-action>
    <v-btn
      :aria-label="t('common.save')"
      class="floating-fab floating-fab--left"
      color="primary"
      :disabled="!canSave"
      :elevation="saving ? 0 : 4"
      icon
      :loading="saving"
      size="x-large"
      @click="save"
    >
      <v-icon>mdi-check</v-icon>
    </v-btn>

    <option-panel
      ref="optionsPanel"
      :title="t('common.options')"
    >
      <button
        v-ripple
        :aria-pressed="draft.fav"
        class="option-row option-row--action"
        type="button"
        @click.stop="draft.fav = !draft.fav"
      >
        <span class="option-row__label">{{ t('add.mark-as-fav') }}</span>
        <v-icon :color="draft.fav ? 'yellow-darken-2' : draft.color">
          {{ draft.fav ? 'mdi-star' : 'mdi-star-outline' }}
        </v-icon>
      </button>
      <button
        v-if="isEdit"
        v-ripple
        class="option-row option-row--action"
        :disabled="!canSave"
        type="button"
        @click.stop="moveToBin"
      >
        <span class="option-row__label">{{ t('add.move-to-bin') }}</span>
        <v-icon :color="draft.color">
          mdi-trash-can
        </v-icon>
      </button>
      <div class="option-row">
        <span class="option-row__label">{{ t('common.color') }}</span>
        <color-palette v-model="draft.color" />
      </div>
      <div class="option-row">
        <span class="option-row__label">{{ t('common.label') }}</span>
        <v-chip-group
          v-if="library.labels.length"
          v-model="draft.labels"
          class="add__labels"
          column
          multiple
        >
          <v-chip
            v-for="label in library.labels"
            :key="label.docId"
            :color="draft.color"
            filter
            size="small"
            :value="label.docId"
            variant="outlined"
          >
            {{ label.label }}
          </v-chip>
        </v-chip-group>
        <span
          v-else
          class="px-3"
        >-</span>
      </div>
      <button
        v-ripple
        class="option-row option-row--action"
        type="button"
        @click.stop="openDialog('import')"
      >
        <span class="option-row__label">{{ t('add.import.title') }}</span>
        <v-icon :color="draft.color">
          mdi-file-import
        </v-icon>
      </button>
      <button
        v-ripple
        class="option-row option-row--action"
        type="button"
        @click.stop="exportSet('csv')"
      >
        <span class="option-row__label">{{ t('add.export.csv') }}</span>
        <v-icon :color="draft.color">
          mdi-file-delimited
        </v-icon>
      </button>
      <button
        v-ripple
        class="option-row option-row--action"
        type="button"
        @click.stop="exportSet('json')"
      >
        <span class="option-row__label">{{ t('add.export.json') }}</span>
        <v-icon :color="draft.color">
          mdi-code-json
        </v-icon>
      </button>
      <button
        v-ripple
        class="option-row option-row--action"
        type="button"
        @click.stop="openDialog('reorder')"
      >
        <span class="option-row__label">{{ t('add.reorder.title') }}</span>
        <v-icon :color="draft.color">
          mdi-sort
        </v-icon>
      </button>
      <button
        v-if="draft.docId"
        v-ripple
        class="option-row option-row--action"
        :disabled="saving"
        type="button"
        @click.stop="duplicateSet"
      >
        <span class="option-row__label">{{ t('add.duplicate.action') }}</span>
        <v-icon :color="draft.color">
          mdi-content-copy
        </v-icon>
      </button>
    </option-panel>

    <import-cards-dialog
      v-model="importOpen"
      :color="draft.color"
      @import="onImport"
    />
    <reorder-cards-dialog
      v-model="reorderOpen"
      :cards="draft.cards"
      :color="draft.color"
      @reorder="(cards) => (draft.cards = cards)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import BarTop from '@/components/BarTop.vue';
import BtnAction from '@/components/BtnAction.vue';
import ColorPalette from '@/components/ColorPalette.vue';
import ContainerEmpty from '@/components/ContainerEmpty.vue';
import GroupCardFlash from '@/components/GroupCardFlash.vue';
import ImportCardsDialog from '@/components/ImportCardsDialog.vue';
import OptionPanel from '@/components/OptionPanel.vue';
import ReorderCardsDialog from '@/components/ReorderCardsDialog.vue';
import type { CardSet, FlashCard } from '@/types';
import { exportFileName, setToCsv, setToJson } from '@/utils/cardExport';
import { uid } from '@/utils/cardSets';
import { duplicateCards } from '@/utils/duplicateCards';
import { downloadText } from '@/utils/download';
import { useLibraryStore } from '@/stores/library';
import { useSessionStore } from '@/stores/session';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const library = useLibraryStore();
const session = useSessionStore();

const isEdit = route.name === 'edit';
const draft = ref<CardSet>(newSet());
const snapshot = ref(JSON.stringify(draft.value));
// Edit mode only becomes writable once the stored set has been copied in.
const loaded = ref(!isEdit);
const titleEdit = ref(false);
const focusedIndex = ref(0);
const saving = ref(false);
const importOpen = ref(false);
const reorderOpen = ref(false);
const optionsPanel = ref<InstanceType<typeof OptionPanel> | null>(null);
const cardGroup = ref<InstanceType<typeof GroupCardFlash> | null>(null);

const setLabels = computed(() => library.labels.filter((l) => draft.value.labels.includes(l.docId)));
const dirty = computed(() => JSON.stringify(draft.value) !== snapshot.value);
// A brand-new set with no cards is not worth saving; an edited one always is.
const needsSave = computed(() => loaded.value && dirty.value && (isEdit || draft.value.cards.length > 0));
const canSave = computed(() => loaded.value && !saving.value && (isEdit || draft.value.cards.length > 0));

watch(needsSave, (value) => (session.unsavedChanges = value), { immediate: true });

function newSet(): CardSet {
  return {
    id: uid(),
    title: '',
    color: '#E91E63',
    date: new Date(),
    trashed: false,
    fav: false,
    labels: [],
    cards: [],
  };
}

function cloneSet(set: CardSet): CardSet {
  return { ...set, date: new Date(set.date), labels: [...set.labels], cards: set.cards.map((c) => ({ ...c })) };
}

// Editing: wait for the library, then copy the set into the draft.
if (isEdit) {
  watch(
    () => library.status,
    (status) => {
      if (status === 'error') {
        // The store already showed the load error; nothing here can be edited safely.
        void router.replace('/home');
        return;
      }
      if (status !== 'ready' || loaded.value) {
        return;
      }
      const existing = library.findSet(String(route.params.id));
      if (!existing?.docId) {
        session.showSnack(t('toast.set-not-found'));
        void router.replace('/home');
        return;
      }
      draft.value = cloneSet(existing);
      snapshot.value = JSON.stringify(draft.value);
      loaded.value = true;
    },
    { immediate: true },
  );
}

function addCard() {
  const card: FlashCard = { id: uid(), front: '', back: '', learned: false, date: new Date().toISOString() };
  const index = focusedIndex.value;
  draft.value.cards.splice(index, 0, card);
  void nextTick(() => cardGroup.value?.scrollToCard(index));
}

function openDialog(which: 'import' | 'reorder') {
  optionsPanel.value?.toggle(false);
  (which === 'import' ? importOpen : reorderOpen).value = true;
}

function onImport(imported: { front: string; back: string }[]) {
  const date = new Date().toISOString();
  const cards = imported.map(({ front, back }): FlashCard => ({ id: uid(), front, back, learned: false, date }));
  draft.value.cards.push(...cards);
}

function exportSet(format: 'csv' | 'json') {
  optionsPanel.value?.toggle(false);
  const name = exportFileName(draft.value.title, format);
  if (format === 'csv') {
    downloadText(name, setToCsv(draft.value), 'text/csv;charset=utf-8');
  } else {
    downloadText(name, setToJson(draft.value), 'application/json');
  }
}

async function duplicateSet() {
  optionsPanel.value?.toggle(false);
  if (saving.value || !draft.value.docId) {
    return;
  }
  if (needsSave.value && !(await commit())) {
    return;
  }
  const source = draft.value;
  const date = new Date();
  const copy: CardSet = {
    id: uid(),
    title: t('add.duplicate.title', { title: source.title || t('add.set.notitle') }),
    color: source.color,
    date,
    trashed: false,
    fav: false,
    labels: [...source.labels],
    cards: duplicateCards(source.cards),
  };
  if (!session.online) {
    session.showSnack(t('toast.offline-save'));
    return;
  }
  saving.value = true;
  let created: CardSet | null;
  try {
    created = await library.createSet(copy);
  } finally {
    saving.value = false;
  }
  if (created) {
    await router.push(`/${created.id}/edit`);
  }
}

let undoCardDelete: (() => void) | null = null;

function onCardDelete({ val, index }: { val: FlashCard; index: number }) {
  undoCardDelete = () => {
    if (!draft.value.cards.some((c) => c.id === val.id)) {
      draft.value.cards.splice(Math.min(index, draft.value.cards.length), 0, val);
    }
  };
  session.showSnack(t('add.card-delete'), { text: t('common.undo'), onAction: undoCardDelete });
}

/** Writes `set` once; concurrent calls are ignored so a set is never created twice. */
async function persist(set: CardSet): Promise<boolean> {
  if (saving.value || !loaded.value || (isEdit && !set.docId)) {
    return false;
  }
  if (!session.online) {
    session.showSnack(t('toast.offline-save'));
    return false;
  }
  saving.value = true;
  try {
    if (set.docId) {
      return await library.saveSet(set);
    }
    const created = await library.createSet(set);
    if (created) {
      draft.value = { ...draft.value, docId: created.docId };
    }
    return !!created;
  } finally {
    saving.value = false;
  }
}

async function commit(set: CardSet = draft.value): Promise<boolean> {
  const ok = await persist(set);
  if (ok) {
    draft.value = { ...set, docId: draft.value.docId ?? set.docId };
    snapshot.value = JSON.stringify(draft.value);
  }
  return ok;
}

async function save() {
  if (canSave.value && (await commit())) {
    await router.push('/home');
  }
}

function goBack() {
  // Saving happens in the leave guard below, whichever way the user leaves.
  void router.push('/home');
}

async function moveToBin() {
  optionsPanel.value?.toggle(false);
  if (await commit({ ...draft.value, trashed: true })) {
    session.showSnack(t('toast.moved-to-bin'));
    await router.push('/home');
  }
}

// Back button, bottom nav, browser back or Android back gesture: save first.
onBeforeRouteLeave(async () => {
  if (!session.user) {
    return true;
  }
  if (saving.value) {
    return false;
  }
  if (!needsSave.value || (await commit())) {
    return true;
  }
  return window.confirm(t('add.discard-confirm'));
});

onBeforeUnmount(() => {
  session.unsavedChanges = false;
  if (undoCardDelete) {
    session.dismissSnack(undoCardDelete);
  }
});
</script>

<style scoped>
.add__title {
  max-width: 100%;
  overflow: hidden;
  color: inherit;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  background: none;
  border: 0;
}
.add__title-field {
  max-width: 320px;
}
.add__labels {
  justify-content: flex-end;
  max-width: calc(100% - 64px);
}
</style>
