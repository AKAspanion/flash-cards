<template>
  <v-dialog
    max-width="420"
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="pa-2">
      <v-card-title class="text-title-large">
        {{ t('study.summary.title') }}
      </v-card-title>
      <v-card-text class="text-body-large">
        {{ t('study.summary.result', { known, total }, total) }}
      </v-card-text>
      <v-card-actions class="flex-wrap">
        <v-spacer />
        <v-btn
          v-if="missed > 0"
          color="primary"
          variant="text"
          @click="emit('review-missed')"
        >
          {{ t('study.summary.review-missed', { missed }) }}
        </v-btn>
        <v-btn
          color="primary"
          variant="text"
          @click="emit('home')"
        >
          {{ t('study.summary.home') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

defineProps<{ modelValue: boolean; known: number; total: number; missed: number }>();
const emit = defineEmits<{
  'update:modelValue': [open: boolean];
  'review-missed': [];
  home: [];
}>();

const { t } = useI18n();
</script>
