<template>
  <v-dialog
    max-width="480"
    :model-value="modelValue"
    scrollable
    @update:model-value="onToggle"
  >
    <v-card class="pa-2">
      <v-card-title class="text-title-large">
        {{ t('add.reorder.title') }}
      </v-card-title>
      <v-card-text>
        <ul class="reorder__list">
          <li
            v-for="(card, index) in order"
            :key="card.id"
            class="reorder__row"
          >
            <span class="reorder__text">{{ card.front || '-' }}</span>
            <v-btn
              :aria-label="`${t('add.reorder.up')}: ${card.front}`"
              :color="color"
              :disabled="index === 0"
              icon="mdi-arrow-up"
              size="small"
              variant="text"
              @click="move(index, -1)"
            />
            <v-btn
              :aria-label="`${t('add.reorder.down')}: ${card.front}`"
              :color="color"
              :disabled="index === order.length - 1"
              icon="mdi-arrow-down"
              size="small"
              variant="text"
              @click="move(index, 1)"
            />
          </li>
        </ul>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          :color="color"
          variant="text"
          @click="onToggle(false)"
        >
          {{ t('common.close') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { FlashCard } from '@/types';

const props = defineProps<{ modelValue: boolean; cards: FlashCard[]; color: string }>();
const emit = defineEmits<{
  'update:modelValue': [open: boolean];
  reorder: [cards: FlashCard[]];
}>();

const { t } = useI18n();
const order = ref<FlashCard[]>([]);
let moved = false;

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      order.value = [...props.cards];
      moved = false;
    }
  },
  { immediate: true },
);

function move(index: number, by: -1 | 1) {
  const next = [...order.value];
  [next[index], next[index + by]] = [next[index + by], next[index]];
  order.value = next;
  moved = true;
}

/** Changes apply when the dialog closes; closing without a move changes nothing. */
function onToggle(open: boolean) {
  if (!open && moved) {
    emit('reorder', order.value);
    moved = false;
  }
  emit('update:modelValue', open);
}
</script>

<style scoped>
.reorder__list {
  padding: 0;
  list-style: none;
}
.reorder__row {
  display: flex;
  align-items: center;
  min-height: 48px;
  gap: 4px;
}
.reorder__text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
