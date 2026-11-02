<template>
  <v-menu
    v-model="menu"
    :close-on-content-click="false"
  >
    <template #activator="{ props: activator }">
      <v-btn
        v-bind="activator"
        :aria-label="t('common.color')"
        :color="modelValue"
        icon
        size="small"
        variant="text"
      >
        <v-icon>mdi-palette</v-icon>
      </v-btn>
    </template>
    <v-card
      class="pa-6"
      width="272"
    >
      <div class="d-flex flex-wrap">
        <v-avatar
          v-for="color in COLORS"
          :key="color"
          :aria-label="color"
          :aria-pressed="isSelected(color)"
          class="ma-1 selectable"
          :color="color"
          role="button"
          tabindex="0"
          @click="emit('update:modelValue', color)"
          @keydown.enter="emit('update:modelValue', color)"
        >
          <v-fab-transition>
            <v-icon
              v-if="isSelected(color)"
              color="white"
            >
              mdi-check
            </v-icon>
          </v-fab-transition>
        </v-avatar>
      </div>
      <div class="d-flex">
        <v-spacer />
        <v-btn
          class="mt-4"
          variant="text"
          @click="menu = false"
        >
          {{ t('common.done') }}
        </v-btn>
      </div>
    </v-card>
  </v-menu>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

const COLORS = ['#F4511E', '#43A047', '#009688', '#1E88E5', '#5E35B1', '#8E24AA', '#827717', '#E91E63'];

const props = defineProps<{ modelValue: string }>();
const emit = defineEmits<{ 'update:modelValue': [color: string] }>();

const { t } = useI18n();
const menu = ref(false);

function isSelected(color: string) {
  return color.toLowerCase() === (props.modelValue || '').toLowerCase();
}
</script>
