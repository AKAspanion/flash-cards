<template>
  <div
    ref="panel"
    class="option-panel"
    :style="panelStyle"
  >
    <v-card
      class="option-panel__card"
      color="surface-light"
      elevation="6"
    >
      <div
        v-ripple
        :aria-expanded="open"
        :aria-label="title"
        class="option-panel__handle"
        role="button"
        tabindex="0"
        @click="onHandleClick"
        @keydown.enter.prevent="toggle()"
        @keydown.space.prevent="toggle()"
        @touchstart.passive="onTouchStart"
        @touchmove.passive="onTouchMove"
        @touchend="onTouchEnd"
        @touchcancel="drag = null"
      >
        <v-icon :disabled="session.loading">
          mdi-drag-horizontal
        </v-icon>
      </div>
      <div
        v-if="title"
        class="option-panel__content text-title-large text-uppercase px-5 pt-4"
      >
        {{ title }}
      </div>
      <div class="option-panel__content option-panel__body pt-6 pb-12 px-5 mb-2">
        <slot />
      </div>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useSessionStore } from '@/stores/session';

const PEEK = 56;

defineProps<{ title?: string }>();

const session = useSessionStore();
const panel = ref<HTMLElement | null>(null);
const open = ref(false);

// Drag state
const drag = ref<{ startY: number; startTime: number; height: number; distance: number } | null>(null);
let usedTouch = false;

const panelStyle = computed(() => {
  if (drag.value) {
    const { distance, height } = drag.value;
    // Closed: follow the finger upwards. Open: follow it downwards.
    const y = open.value ? Math.max(0, -distance) : Math.min(height - PEEK, Math.max(0, height - PEEK - distance));
    return { transform: `translate3d(0, ${y}px, 0)`, transition: 'none' };
  }
  return { transform: open.value ? 'translate3d(0, 0, 0)' : `translate3d(0, calc(100% - ${PEEK}px), 0)` };
});

function toggle(value = !open.value) {
  open.value = value;
}

function onHandleClick() {
  // A tap already toggled on touchend; skip the click the browser synthesizes after it.
  if (usedTouch) {
    usedTouch = false;
    return;
  }
  toggle();
}

function onTouchStart(e: TouchEvent) {
  usedTouch = true;
  drag.value = {
    startY: e.touches[0].clientY,
    startTime: e.timeStamp,
    height: panel.value?.offsetHeight ?? 0,
    distance: 0,
  };
}

function onTouchMove(e: TouchEvent) {
  if (drag.value) {
    drag.value = { ...drag.value, distance: drag.value.startY - e.touches[0].clientY };
  }
}

function onTouchEnd(e: TouchEvent) {
  const state = drag.value;
  drag.value = null;
  if (!state) {
    return;
  }
  if (Math.abs(state.distance) < 4) {
    toggle();
    return;
  }
  const velocity = Math.abs(state.distance) / Math.max(1, e.timeStamp - state.startTime);
  if (open.value) {
    const keepOpen = velocity > 0.5 ? state.distance > 0 : -state.distance + 32 <= state.height / 2;
    toggle(keepOpen);
  } else {
    const shouldOpen = velocity > 0.5 ? state.distance > 0 : state.distance >= state.height / 2 - 64;
    toggle(shouldOpen);
  }
}

// Close when tapping outside, but not on buttons (which may be the opener)
// or inside overlays such as menus opened from the panel.
function onDocumentClick(e: MouseEvent) {
  const target = e.target as Element | null;
  if (!open.value || !target || !target.isConnected) {
    return;
  }
  if (panel.value?.contains(target) || target.closest('.v-btn, .v-overlay-container, .v-overlay')) {
    return;
  }
  toggle(false);
}

onMounted(() => document.addEventListener('click', onDocumentClick));
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick));

defineExpose({ toggle });
</script>

<style scoped>
.option-panel {
  position: fixed;
  bottom: -28px;
  left: 12px;
  z-index: 110;
  width: calc(100% - 24px);
  transition: transform 200ms ease-out;
  will-change: transform;
}
.option-panel__card {
  display: flex;
  flex-direction: column;
  /* Open, the panel stops below the 120px top bar; longer content scrolls inside it. */
  max-height: calc(100vh - 100px);
  max-height: calc(100dvh - 100px);
}
.option-panel__body {
  min-height: 0;
  overflow-y: auto;
}
.option-panel__handle {
  display: flex;
  justify-content: center;
  cursor: pointer;
}
.option-panel__content {
  /* Full width up to 400px: auto margins in the card's flex column would otherwise shrink it. */
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
}
</style>
