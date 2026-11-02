<template>
  <div class="px-4 py-2">
    <div class="bar-top">
      <div class="bar-top__side">
        <v-btn
          :aria-label="leftLabel || t('common.back')"
          height="64"
          icon
          variant="text"
          width="64"
          @click="emit('click:left')"
        >
          <slot name="left-button" />
        </v-btn>
        <div class="bar-top__text text-label-medium text-uppercase">
          <slot name="left-text" />
        </div>
      </div>
      <div class="bar-top__center">
        <slot name="center" />
      </div>
      <div class="bar-top__side">
        <slot name="right">
          <template v-if="slots['right-button']">
            <v-btn
              :aria-label="rightLabel || t('common.options')"
              height="64"
              icon
              variant="text"
              width="64"
              @click="emit('click:right')"
            >
              <slot name="right-button" />
            </v-btn>
            <div class="bar-top__text text-label-medium text-uppercase">
              <slot name="right-text" />
            </div>
          </template>
        </slot>
      </div>
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { useSlots } from 'vue';
import { useI18n } from 'vue-i18n';

defineProps<{ leftLabel?: string; rightLabel?: string }>();
const emit = defineEmits<{ 'click:left': []; 'click:right': [] }>();
const slots = useSlots();
const { t } = useI18n();
</script>

<style scoped>
.bar-top {
  display: flex;
  align-items: center;
  height: 120px;
  padding: 0 4px;
}
.bar-top__side {
  width: 64px;
  min-width: 64px;
  text-align: center;
}
.bar-top__center {
  flex: 1 1 auto;
  min-width: 0;
  max-height: 120px;
  overflow: hidden;
}
.bar-top__text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
