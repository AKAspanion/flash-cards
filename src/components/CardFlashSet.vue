<template>
  <v-card
    class="set-card"
    color="surface-light"
    elevation="3"
    height="182"
  >
    <div
      ref="swipeEl"
      class="set-card__swipe"
      :style="swipeStyle"
      @touchstart.passive="onTouchStart"
      @touchmove.passive="onTouchMove"
      @touchend="onTouchEnd"
      @touchcancel="resetSwipe"
    >
      <v-card
        class="pa-6"
        :color="headerColor"
        flat
        height="100"
        theme="dark"
      >
        <div class="d-flex align-center text-uppercase">
          <v-scale-transition origin="center center">
            <v-icon
              v-if="card.fav"
              class="mr-1"
              color="yellow"
              @click="emit('star')"
            >
              mdi-star
            </v-icon>
          </v-scale-transition>
          <div
            class="text-truncate"
            :title="title"
          >
            {{ title }}
          </div>
          <v-spacer />
          <v-chip
            v-if="!bin"
            role="button"
            :aria-label="t('common.edit')"
            class="ml-2"
            :disabled="disabled || !session.online"
            size="small"
            variant="outlined"
            @click="router.push(`/${card.id}/edit`)"
          >
            <v-icon size="small">
              mdi-pencil
            </v-icon>
          </v-chip>
        </div>
        <div class="set-card__labels">
          <v-chip
            v-for="label in labels"
            :key="label.docId"
            role="button"
            class="mr-1 mt-2"
            size="small"
            variant="outlined"
            @click="emit('label', label)"
          >
            {{ label.label }}
          </v-chip>
        </div>
      </v-card>
    </div>
    <div class="d-flex align-center pa-6">
      <template v-if="bin">
        <v-btn
          :aria-label="t('common.delete')"
          :color="card.color"
          :disabled="disabled"
          icon
          variant="text"
          @click="emit('delete', card)"
        >
          <v-icon>mdi-delete-forever</v-icon>
        </v-btn>
        <v-spacer />
        <v-btn
          :aria-label="t('common.restore')"
          :color="card.color"
          :disabled="disabled"
          icon
          variant="text"
          @click="emit('restore', card)"
        >
          <v-icon>mdi-restore</v-icon>
        </v-btn>
      </template>
      <template v-else>
        <div>
          <div class="text-label-medium text-uppercase">
            {{ t('common.memorized') }}
          </div>
          <div class="text-body-small d-flex align-center">
            <span>{{ learned }} / {{ card.cards.length }}</span>
            <span class="mx-2">-</span>
            <span>{{ percentage }}%</span>
          </div>
        </div>
        <v-spacer />
        <div
          v-if="counts.due || counts.new"
          class="text-label-medium text-right mr-3"
        >
          <div v-if="counts.due">
            {{ t('due.set-count', { n: counts.due }) }}
          </div>
          <div v-if="counts.new">
            {{ t('due.set-new', { m: counts.new }) }}
          </div>
        </div>
        <v-chip
          :disabled="disabled"
          size="small"
          role="button"
          variant="outlined"
          @click="router.push(`/${card.id}/view`)"
        >
          {{ percentage === 100 ? t('common.review') : t('common.browse') }}
        </v-chip>
      </template>
    </div>
    <v-icon
      class="set-card__hidden-icon set-card__hidden-icon--left"
      :color="favTriggered ? 'yellow' : undefined"
    >
      mdi-star
    </v-icon>
    <v-icon
      class="set-card__hidden-icon set-card__hidden-icon--right"
      :color="binTriggered ? 'error' : undefined"
    >
      mdi-trash-can
    </v-icon>
  </v-card>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import type { CardSet, Label } from '@/types';
import { learnedCount } from '@/utils/cardSets';
import { shade } from '@/utils/color';
import { localDate } from '@/utils/dates';
import { setDueCounts } from '@/utils/srs';
import { useLibraryStore } from '@/stores/library';
import { useSessionStore } from '@/stores/session';

const SWIPE_MAX = 100;
const SWIPE_TRIGGER = 62;

const props = withDefaults(defineProps<{ card: CardSet; bin?: boolean; disabled?: boolean }>(), {
  bin: false,
  disabled: false,
});
const emit = defineEmits<{
  fav: [card: CardSet];
  star: [];
  delete: [card: CardSet];
  restore: [card: CardSet];
  label: [label: Label];
}>();

const { t } = useI18n();
const router = useRouter();
const session = useSessionStore();
const library = useLibraryStore();

const title = computed(() => props.card.title || t('add.set.notitle'));
const headerColor = computed(() => shade(props.card.color || '#E91E63'));
const labels = computed(() => library.labels.filter((label) => props.card.labels.includes(label.docId)));
const learned = computed(() => learnedCount(props.card));
const percentage = computed(() =>
  props.card.cards.length ? Math.floor((learned.value / props.card.cards.length) * 100) : 0,
);
const counts = computed(() => setDueCounts(props.card, localDate()));
const swipeDisabled = computed(() => props.bin || props.disabled || !session.online);

// ---- swipe right to favourite, left to move to bin ----
const start = ref<{ x: number; y: number } | null>(null);
const direction = ref<'none' | 'horizontal' | 'vertical'>('none');
const offset = ref(0);
const dragging = ref(false);

const favTriggered = computed(() => offset.value >= SWIPE_TRIGGER);
const binTriggered = computed(() => offset.value <= -SWIPE_TRIGGER);
const swipeStyle = computed(() => ({
  transform: `translate3d(${offset.value}px, 0, 0)`,
  transition: dragging.value ? 'none' : 'transform 200ms ease-out',
}));

function onTouchStart(e: TouchEvent) {
  if (swipeDisabled.value) {
    return;
  }
  const touch = e.touches[0];
  start.value = { x: touch.clientX, y: touch.clientY };
  direction.value = 'none';
}

function onTouchMove(e: TouchEvent) {
  if (!start.value || swipeDisabled.value) {
    return;
  }
  const touch = e.touches[0];
  const dx = touch.clientX - start.value.x;
  const dy = touch.clientY - start.value.y;
  if (direction.value === 'none') {
    direction.value = Math.abs(dy) > Math.abs(dx) ? 'vertical' : 'horizontal';
  }
  if (direction.value !== 'horizontal') {
    return;
  }
  dragging.value = true;
  offset.value = Math.max(-SWIPE_MAX, Math.min(SWIPE_MAX, dx));
}

function onTouchEnd() {
  if (favTriggered.value) {
    emit('fav', props.card);
  } else if (binTriggered.value) {
    emit('delete', props.card);
  }
  resetSwipe();
}

function resetSwipe() {
  start.value = null;
  direction.value = 'none';
  dragging.value = false;
  offset.value = 0;
}
</script>

<style scoped>
.set-card {
  position: relative;
  overflow: hidden;
}
.set-card__swipe {
  position: relative;
  z-index: 2;
}
.set-card__labels {
  white-space: nowrap;
  overflow: hidden;
}
.set-card__hidden-icon {
  position: absolute;
  top: 38px;
  z-index: 1;
}
.set-card__hidden-icon--left {
  left: 38px;
}
.set-card__hidden-icon--right {
  right: 38px;
}
</style>
