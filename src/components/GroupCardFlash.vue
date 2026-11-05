<template>
  <div
    ref="container"
    class="card-slider"
    @scroll.passive="updateFocused"
  >
    <section class="card-slider__spacer" />
    <section
      v-for="(card, index) in modelValue"
      :key="itemKeys[index]"
      class="card-slider__item"
      :style="{ width: itemWidth }"
    >
      <card-flash
        :browse="browse"
        :color="color"
        :disabled="disabled"
        :labels="labels"
        :model-value="card"
        :ref="(el) => setCardRef(el, index)"
        :number="index + 1"
        :rating="rating"
        :reverse="reverse"
        :speech="speech"
        @add-after="onAddAfter"
        @check="onCheck"
        @delete="onDelete"
        @rate="(rating) => emit('rate', { card, rating })"
        @update:model-value="onUpdate"
      />
    </section>
    <section class="card-slider__spacer" />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useDisplay } from 'vuetify';
import type { FlashCard, Label, SpeechLanguages } from '@/types';
import { uid } from '@/utils/cardSets';
import type { Rating } from '@/utils/srs';
import CardFlash from './CardFlash.vue';

const props = withDefaults(
  defineProps<{
    modelValue: FlashCard[];
    color?: string;
    labels?: Label[];
    browse?: boolean;
    disabled?: boolean;
    reverse?: boolean;
    rating?: boolean;
    speech?: SpeechLanguages;
  }>(),
  { color: '', labels: () => [], browse: false, disabled: false, reverse: false, rating: false, speech: undefined },
);
const emit = defineEmits<{
  'update:modelValue': [cards: FlashCard[]];
  delete: [payload: { val: FlashCard; index: number }];
  focused: [index: number];
  rate: [payload: { card: FlashCard; rating: Rating }];
}>();

type CardHandle = {
  flip: () => void;
  edit: (side: 'front' | 'back') => void;
  rate: (rating: Rating) => boolean;
  readAloud: () => void;
};

const { xs } = useDisplay();
const container = ref<HTMLElement | null>(null);
const itemWidth = computed(() => (xs.value ? '82.5vw' : '70.5vw'));
let wheelLocked = false;
let focused = 0;
let pendingTarget: number | null = null;
let pendingTimer: ReturnType<typeof setTimeout> | undefined;
const cardRefs: Array<CardHandle | null> = [];
// A card can be queued twice (rated "again"), so a repeat gets its own key.
const itemKeys = computed(() => {
  const seen = new Map<string, number>();
  return props.modelValue.map((card) => {
    const n = seen.get(card.id) ?? 0;
    seen.set(card.id, n + 1);
    return n ? `${card.id}#${n}` : card.id;
  });
});

function setCardRef(el: unknown, index: number) {
  cardRefs[index] = (el as CardHandle | null) ?? null;
}

function itemSize(): number {
  const item = container.value?.querySelector<HTMLElement>('.card-slider__item');
  return item?.getBoundingClientRect().width ?? 0;
}

function scrollByCards(count: number) {
  container.value?.scrollBy({ left: count * itemSize(), behavior: 'smooth' });
}

/** Centres the card at `index`; scroll snapping alone keeps the old card in view after an insert. */
function scrollToCard(index: number) {
  const el = container.value;
  const item = el?.querySelectorAll<HTMLElement>('.card-slider__item')[index];
  if (!el || !item) {
    return;
  }
  const box = el.getBoundingClientRect();
  const rect = item.getBoundingClientRect();
  el.scrollTo({ left: el.scrollLeft + rect.left - box.left - (box.width - rect.width) / 2, behavior: 'smooth' });
}

/**
 * Moves focus to `index` at once, so a second call before the scroll lands acts on the new card,
 * then scrolls there. Scroll events are ignored until the scroll reaches `index` (or a timeout).
 */
function focusCard(index: number) {
  const last = props.modelValue.length - 1;
  if (last < 0) {
    return;
  }
  const target = Math.min(Math.max(Math.trunc(index) || 0, 0), last);
  pendingTarget = target;
  if (pendingTimer) {
    clearTimeout(pendingTimer);
  }
  pendingTimer = setTimeout(() => {
    pendingTarget = null;
  }, 1000);
  if (target !== focused) {
    focused = target;
    emit('focused', target);
  }
  scrollToCard(target);
}

function next() {
  if (focused < props.modelValue.length - 1) {
    focusCard(focused + 1);
  }
}

function prev() {
  if (focused > 0) {
    focusCard(focused - 1);
  }
}

function goTo(index: number) {
  focusCard(index);
}

function flipFocused() {
  cardRefs[focused]?.flip();
}

function rateFocused(rating: Rating): boolean {
  return cardRefs[focused]?.rate(rating) ?? false;
}

function readFocused() {
  cardRefs[focused]?.readAloud();
}

function updateFocused() {
  const size = itemSize();
  const index = size && container.value ? Math.round(container.value.scrollLeft / size) : 0;
  if (pendingTarget !== null) {
    if (index !== pendingTarget) {
      return;
    }
    pendingTarget = null;
  }
  if (index !== focused) {
    focused = index;
    emit('focused', index);
  }
}

// Desktop: turn vertical mouse-wheel movement into one card step at a time.
function onWheel(e: WheelEvent) {
  if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) {
    return;
  }
  e.preventDefault();
  if (wheelLocked) {
    return;
  }
  wheelLocked = true;
  scrollByCards(Math.sign(e.deltaY));
  setTimeout(() => {
    wheelLocked = false;
  }, 400);
}

/** Inserts a blank card right after `card`, brings it into view and opens its front for typing. */
function onAddAfter(card: FlashCard) {
  const at = props.modelValue.findIndex((c) => c.id === card.id);
  if (at < 0) {
    return;
  }
  const blank: FlashCard = { id: uid(), front: '', back: '', learned: false, date: new Date().toISOString() };
  const cards = [...props.modelValue];
  cards.splice(at + 1, 0, blank);
  emit('update:modelValue', cards);
  // Wait for the parent to pass the longer list down and the new card to mount.
  void nextTick(() => {
    focusCard(at + 1);
    cardRefs[at + 1]?.edit('front');
  });
}

function onCheck(learned: boolean) {
  if (learned) {
    scrollByCards(1);
  }
}

function onUpdate(card: FlashCard) {
  emit(
    'update:modelValue',
    props.modelValue.map((c) => (c.id === card.id ? { ...card } : c)),
  );
}

function onDelete(card: FlashCard) {
  const index = props.modelValue.findIndex((c) => c.id === card.id);
  emit(
    'update:modelValue',
    props.modelValue.filter((c) => c.id !== card.id),
  );
  emit('delete', { val: card, index });
}

onMounted(() => {
  container.value?.addEventListener('wheel', onWheel, { passive: false });
});
onBeforeUnmount(() => {
  clearTimeout(pendingTimer);
  container.value?.removeEventListener('wheel', onWheel);
});

defineExpose({ scrollToCard, next, prev, goTo, flipFocused, rateFocused, readFocused });
</script>

<style scoped>
.card-slider {
  display: flex;
  overflow-x: auto;
  scroll-behavior: smooth;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
}
.card-slider__item {
  position: relative;
  flex: 0 0 auto;
  height: calc(100vh - 160px);
  scroll-snap-align: center;
}
.card-slider__spacer {
  flex: 0 0 28px;
  height: calc(100vh - 160px);
}
</style>
