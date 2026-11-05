<template>
  <v-dialog
    max-width="420"
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="pa-2">
      <v-card-title class="text-title-large">
        {{ t('share.action') }}
      </v-card-title>
      <v-card-text>
        <p>{{ t('share.desc') }}</p>
        <p class="share-dialog__link mt-4 pa-3 rounded">
          {{ link }}
        </p>
      </v-card-text>
      <v-card-actions class="flex-wrap">
        <v-btn
          color="error"
          variant="text"
          @click="emit('stop')"
        >
          {{ t('share.stop') }}
        </v-btn>
        <v-spacer />
        <v-btn
          variant="text"
          @click="emit('update:modelValue', false)"
        >
          {{ t('common.close') }}
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          @click="copyLink"
        >
          {{ t('share.copy') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSessionStore } from '@/stores/session';

const props = defineProps<{ modelValue: boolean; shareId: string }>();
const emit = defineEmits<{ 'update:modelValue': [open: boolean]; stop: [] }>();

const { t } = useI18n();
const session = useSessionStore();

// The public page for a shared set (spec 11.2); it shows the copy only, never the owner's set.
const link = computed(() => `${window.location.origin}/s/${props.shareId}`);

async function copyLink() {
  try {
    await navigator.clipboard.writeText(link.value);
    session.showSnack(t('share.copied'));
  } catch (err) {
    console.warn('Could not copy the share link.', (err as Error)?.name);
    session.showSnack(t('info.copied.failed'));
  }
}
</script>

<style scoped>
.share-dialog__link {
  word-break: break-all;
  user-select: all;
  background: rgba(var(--v-theme-on-surface), 0.06);
}
</style>
