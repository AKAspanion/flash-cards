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
      <div class="option-row">
        <span class="option-row__label">{{ t('add.mark-as-fav') }}</span>
        <v-btn
          :aria-label="t('add.mark-as-fav')"
          :aria-pressed="draft.fav"
          :color="draft.fav ? 'yellow-darken-2' : draft.color"
          icon
          size="small"
          variant="text"
          @click.stop="draft.fav = !draft.fav"
        >
          <v-icon>{{ draft.fav ? 'mdi-star' : 'mdi-star-outline' }}</v-icon>
        </v-btn>
      </div>
      <div
        v-if="isEdit"
        class="option-row"
      >
        <span class="option-row__label">{{ t('add.move-to-bin') }}</span>
        <v-btn
          :aria-label="t('add.move-to-bin')"
          :color="draft.color"
          :disabled="!canSave"
          icon
          size="small"
          variant="text"
          @click.stop="moveToBin"
        >
          <v-icon>mdi-trash-can</v-icon>
        </v-btn>
      </div>
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
    </option-panel>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import BarTop from '@/components/BarTop.vue';
import BtnAction from '@/components/BtnAction.vue';
import ColorPalette from '@/components/ColorPalette.vue';
import ContainerEmpty from '@/components/ContainerEmpty.vue';
import GroupCardFlash from '@/components/GroupCardFlash.vue';
import OptionPanel from '@/components/OptionPanel.vue';
import type { CardSet, FlashCard } from '@/types';
import { uid } from '@/utils/cardSets';
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
const optionsPanel = ref<InstanceType<typeof OptionPanel> | null>(null);

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
  draft.value.cards.splice(focusedIndex.value, 0, card);
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
