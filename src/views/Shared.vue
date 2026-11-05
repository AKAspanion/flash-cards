<template>
  <div class="shared">
    <bar-top @click:left="router.push(backPath)">
      <template #left-button>
        <v-icon
          color="primary"
          size="32"
        >
          mdi-arrow-left
        </v-icon>
      </template>
      <template #left-text>
        {{ session.user ? t('common.home') : t('login.login') }}
      </template>
    </bar-top>

    <div
      v-if="state === 'loading'"
      class="shared__loading"
    >
      <v-progress-circular
        :aria-label="t('common.loading')"
        color="primary"
        indeterminate
      />
    </div>
    <container-empty
      v-else-if="state === 'missing'"
      icon="mdi-link-variant-off"
      :subtitle="t('share.missing.subtitle')"
      :title="t('share.missing.title')"
    />
    <container-empty
      v-else-if="state === 'error'"
      icon="mdi-alert-circle-outline"
      :subtitle="t('empty.error.subtitle')"
      :title="t('empty.error.title')"
    >
      <v-btn
        color="primary"
        rounded="xl"
        @click="load"
      >
        {{ t('common.retry') }}
      </v-btn>
    </container-empty>
    <main
      v-else-if="shared"
      class="shared__content"
    >
      <!-- The title is someone else's text: interpolated, never bound as HTML. -->
      <h1 class="text-headline-small shared__title">
        {{ shared.title || t('add.set.notitle') }}
      </h1>
      <p class="text-title-small shared__count">
        {{ t('share.count', { n: shared.cards.length }, shared.cards.length) }}
      </p>
      <v-btn
        class="shared__add"
        color="primary"
        :loading="adding"
        rounded="xl"
        @click="addToLibrary"
      >
        {{ t('share.add') }}
      </v-btn>
      <ul class="shared__cards">
        <li
          v-for="(card, index) in previewCards"
          :key="index"
          class="shared__card"
          :style="{ borderLeftColor: shared.color }"
        >
          <!-- eslint-disable vue/no-v-html -- renderCardText is the only sanitizer; it never returns unsanitized HTML -->
          <div
            class="shared__side text-body-large"
            v-html="renderCardText(card.front)"
          />
          <div
            class="shared__side shared__side--back text-body-medium"
            v-html="renderCardText(card.back)"
          />
          <!-- eslint-enable vue/no-v-html -->
        </li>
      </ul>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import BarTop from '@/components/BarTop.vue';
import ContainerEmpty from '@/components/ContainerEmpty.vue';
import { fetchSharedSet } from '@/services/firebase';
import { isShareId } from '@/services/cardSetMapper';
import { useLibraryStore } from '@/stores/library';
import { useSessionStore } from '@/stores/session';
import type { CardSet, FlashCard, SharedSet } from '@/types';
import { uid } from '@/utils/cardSets';
import { renderCardText } from '@/utils/markdown';

/** Holds the shareId whose "Add to my library" was pressed signed out, until sign-in brings the visitor back. */
const PENDING_ADD_KEY = 'pending-share-add';
const PREVIEW_COUNT = 5;

type State = 'loading' | 'ready' | 'missing' | 'error';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const session = useSessionStore();
const library = useLibraryStore();

const state = ref<State>('loading');
const shared = ref<SharedSet | null>(null);
const adding = ref(false);

const shareId = computed(() => String(route.params.shareId ?? ''));
const backPath = computed(() => (session.user ? '/home' : '/login'));
const previewCards = computed(() => shared.value?.cards.slice(0, PREVIEW_COUNT) ?? []);

/** The error's class only: never its message, which may carry a path or an upstream detail. */
function errorKind(err: unknown): string {
  const code = (err as { code?: unknown })?.code;
  return typeof code === 'string' ? code : (err as Error)?.name ?? typeof err;
}

let loadGeneration = 0;

async function load() {
  const id = shareId.value;
  const generation = ++loadGeneration;
  shared.value = null;
  // A malformed id never reaches Firestore.
  if (!isShareId(id)) {
    state.value = 'missing';
    return;
  }
  state.value = 'loading';
  let result: SharedSet | null;
  try {
    result = await session.track(fetchSharedSet(id));
  } catch (err) {
    if (generation === loadGeneration) {
      console.warn('Loading a shared set failed:', errorKind(err));
      state.value = 'error';
    }
    return;
  }
  // Another link was opened meanwhile.
  if (generation !== loadGeneration) {
    return;
  }
  shared.value = result;
  state.value = result ? 'ready' : 'missing';
  if (session.user && takePendingAdd(id) && result) {
    await addToLibrary();
  }
}

/** True, and clears it, when "Add to my library" was pressed for exactly this link before signing in. */
function takePendingAdd(id: string): boolean {
  try {
    if (sessionStorage.getItem(PENDING_ADD_KEY) !== id) {
      return false;
    }
    sessionStorage.removeItem(PENDING_ADD_KEY);
    return true;
  } catch (err) {
    console.warn('Reading the pending shared-set add failed:', errorKind(err));
    return false;
  }
}

/** Only the four card fields, with new ids: the copy keeps nothing else a stranger wrote into it. */
function copyCards(cards: FlashCard[]): FlashCard[] {
  return cards.map(({ front, back, date }) => ({ id: uid(), front, back, learned: false, date }));
}

async function addToLibrary() {
  const source = shared.value;
  if (!source || adding.value) {
    return;
  }
  if (!session.user) {
    try {
      sessionStorage.setItem(PENDING_ADD_KEY, source.shareId);
    } catch (err) {
      console.warn('Saving the pending shared-set add failed:', errorKind(err));
    }
    await router.push({ path: '/login', query: { redirect: `/s/${source.shareId}` } });
    return;
  }
  if (!session.online) {
    session.showSnack(t('toast.offline-save'));
    return;
  }
  adding.value = true;
  try {
    // A library load still in flight would otherwise replace the store's sets without the new copy.
    await library.load();
    const copy: CardSet = {
      id: uid(),
      title: source.title,
      color: source.color,
      date: new Date(),
      trashed: false,
      fav: false,
      labels: [],
      cards: copyCards(source.cards),
    };
    const created = await library.createSet(copy);
    if (created) {
      session.showSnack(t('share.added'));
      await router.push(`/${created.id}/view`);
    }
  } finally {
    adding.value = false;
  }
}

watch(shareId, () => void load(), { immediate: true });
</script>

<style scoped>
.shared__loading {
  display: flex;
  justify-content: center;
  padding: 48px 0;
}
.shared__content {
  max-width: 720px;
  padding: 16px 32px 96px;
}
.shared__title {
  overflow-wrap: anywhere;
}
.shared__count {
  margin: 4px 0 16px;
}
.shared__add {
  margin-bottom: 24px;
}
.shared__cards {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0;
  list-style: none;
}
.shared__card {
  padding: 16px 20px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-left-width: 6px;
  border-radius: 12px;
  overflow-wrap: anywhere;
}
.shared__side--back {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed rgba(var(--v-border-color), var(--v-border-opacity));
}
.shared__side :deep(p) {
  margin: 0;
}
.shared__side :deep(ul),
.shared__side :deep(ol) {
  padding-left: 1.5em;
}
.shared__side :deep(pre) {
  overflow-x: auto;
}
.shared__side :deep(img) {
  max-width: 100%;
  height: auto;
}
</style>
