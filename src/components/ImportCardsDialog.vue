<template>
  <v-dialog
    max-width="480"
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="pa-2">
      <v-card-title class="text-title-large">
        {{ t('add.import.title') }}
      </v-card-title>
      <v-card-text>
        <v-textarea
          v-model="text"
          auto-grow
          :label="t('add.import.paste')"
          max-rows="8"
          rows="4"
          variant="outlined"
          @update:model-value="format = 'lines'"
        />
        <label class="import__file">
          <span class="import__file-label">{{ t('add.import.file') }}</span>
          <input
            accept=".csv,.tsv,.txt"
            class="import__file-input"
            type="file"
            @change="onFile"
          >
        </label>
        <p
          v-if="fileTooBig"
          class="text-error mt-3"
          role="alert"
        >
          {{ t('add.import.too-big') }}
        </p>
        <p
          v-if="result.tooMany"
          class="text-error mt-3"
          role="alert"
        >
          {{ t('add.import.too-many') }}
        </p>
        <p
          v-else-if="result.cards.length"
          class="mt-3"
          role="status"
        >
          {{ t('add.import.ready', { n: result.cards.length }, result.cards.length) }}
        </p>
        <p
          v-if="result.skippedLines.length"
          class="mt-1"
        >
          {{ t('add.import.skipped', { k: result.skippedLines.length, list: skippedLinesText(result.skippedLines) }, result.skippedLines.length) }}
        </p>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          variant="text"
          @click="emit('update:modelValue', false)"
        >
          {{ t('common.close') }}
        </v-btn>
        <v-btn
          :color="color"
          :disabled="!canAdd"
          variant="flat"
          @click="confirm"
        >
          {{ t('add.import.confirm') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  importFormatFor,
  MAX_IMPORT_FILE_BYTES,
  parseImport,
  skippedLinesText,
  type ImportFormat,
} from '@/utils/cardImport';

const props = defineProps<{ modelValue: boolean; color: string }>();
const emit = defineEmits<{
  'update:modelValue': [open: boolean];
  import: [cards: { front: string; back: string }[]];
}>();

const { t } = useI18n();
const text = ref('');
const format = ref<ImportFormat>('lines');
const fileTooBig = ref(false);

const result = computed(() => parseImport(text.value, format.value));
const canAdd = computed(() => result.value.cards.length > 0 && !result.value.tooMany);

// A fresh dialog each time it opens.
watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      text.value = '';
      format.value = 'lines';
      fileTooBig.value = false;
    }
  },
);

async function onFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) {
    return;
  }
  fileTooBig.value = file.size > MAX_IMPORT_FILE_BYTES;
  if (!fileTooBig.value) {
    const content = await file.text();
    format.value = importFormatFor(file.name);
    text.value = content;
  }
  // Lets the same file be chosen again.
  input.value = '';
}

function confirm() {
  if (canAdd.value) {
    emit('import', result.value.cards);
    emit('update:modelValue', false);
  }
}
</script>

<style scoped>
.import__file {
  display: block;
}
.import__file-label {
  display: block;
  margin-bottom: 4px;
}
</style>
