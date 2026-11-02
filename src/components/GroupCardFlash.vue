<template>
  <div
    ref="container"
    class="card-slider"
    @scroll.passive="updateFocused"
  >
    <section class="card-slider__spacer" />
    <section
      v-for="(card, index) in modelValue"
      :key="card.id"
      class="card-slider__item"
      :style="{ width: itemWidth }"
    >
      <card-flash
        :browse="browse"
        :color="color"
        :disabled="disabled"
        :labels="labels"
        :model-value="card"
        :number="index + 1"
        @check="onCheck"
        @delete="onDelete"
        @update:model-value="onUpdate"
      />
    </section>
    <section class="card-slider__spacer" />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useDisplay } from 'vuetify';
import type { FlashCard, Label } from '@/types';
import CardFlash from './CardFlash.vue';

const props = withDefaults(
  defineProps<{
    modelValue: FlashCard[];
    color?: string;
    labels?: Label[];
    browse?: boolean;
    disabled?: boolean;
  }>(),
  { color: '', labels: () => [], browse: false, disabled: false },
);
const emit = defineEmits<{
  'update:modelValue': [cards: FlashCard[]];
  delete: [payload: { val: FlashCard; index: number }];
  focused: [index: number];
}>();

const { xs } = useDisplay();
const container = ref<HTMLElement | null>(null);
const itemWidth = computed(() => (xs.value ? '82.5vw' : '70.5vw'));
let wheelLocked = false;
let focused = 0;

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

function updateFocused() {
  const size = itemSize();
  const index = size && container.value ? Math.round(container.value.scrollLeft / size) : 0;
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
  container.value?.removeEventListener('wheel', onWheel);
});

defineExpose({ scrollToCard });
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
