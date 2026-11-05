<template>
  <v-dialog
    max-width="420"
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="pa-2">
      <v-card-title class="text-title-large">
        {{ t('study.shortcuts.title') }}
      </v-card-title>
      <v-card-text>
        <ul class="shortcut-list">
          <li
            v-for="row in rows"
            :key="row.keys"
            class="shortcut-list__row"
          >
            <kbd class="shortcut-list__keys">{{ row.keys }}</kbd>
            <span>{{ row.label }}</span>
          </li>
        </ul>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          color="primary"
          variant="text"
          @click="emit('update:modelValue', false)"
        >
          {{ t('common.close') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [open: boolean] }>();

const { t } = useI18n();

const rows = computed(() => [
  { keys: 'Space', label: t('study.shortcuts.flip') },
  { keys: '→', label: t('study.shortcuts.next') },
  { keys: '←', label: t('study.shortcuts.prev') },
  { keys: 'K', label: t('study.shortcuts.learn') },
  { keys: 'J', label: t('study.shortcuts.unlearn') },
  { keys: '?', label: t('study.shortcuts.help') },
]);
</script>

<style scoped>
.shortcut-list {
  padding: 0;
  list-style: none;
}
.shortcut-list__row {
  display: flex;
  align-items: center;
  min-height: 40px;
  gap: 16px;
}
.shortcut-list__keys {
  min-width: 56px;
  padding: 2px 8px;
  font-family: inherit;
  text-align: center;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.38);
  border-radius: 6px;
}
</style>
