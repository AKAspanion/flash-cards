<template>
  <div
    class="flash-card my-8"
    :style="{ height: browse ? 'calc(100vh - 224px)' : 'calc(100vh - 320px)' }"
  >
    <v-dialog
      v-model="editing"
      :max-width="smAndUp ? '50vw' : undefined"
      @after-enter="textarea?.focus()"
    >
      <v-card class="pa-6">
        <v-textarea
          ref="textarea"
          auto-grow
          :color="cardColor"
          hide-details
          :model-value="flipped ? modelValue.back : modelValue.front"
          :aria-label="flipped ? t('card.placeholder.back') : t('card.placeholder.front')"
          :placeholder="flipped ? t('card.placeholder.back') : t('card.placeholder.front')"
          rounded="xl"
          variant="outlined"
          @update:model-value="update(flipped ? 'back' : 'front', $event)"
        >
          <template #append-inner>
            <v-btn
              :aria-label="t('common.done')"
              :color="cardColor"
              icon
              size="small"
              variant="text"
              @click="editing = false"
            >
              <v-icon>mdi-check</v-icon>
            </v-btn>
          </template>
        </v-textarea>
      </v-card>
    </v-dialog>
    <div
      class="flash-card__inner"
      :class="{
        'flash-card__inner--flipped': flipped,
        'flash-card__inner--learned': browse && modelValue.learned,
        'flash-card__inner--unlearned': browse && !modelValue.learned,
      }"
    >
      <div
        class="flash-card__face pa-6"
        :style="{ backgroundColor: faceColor }"
      >
        <div class="flash-card__content">
          <div
            v-if="!flipped"
            class="flash-card__text text-headline-small my-4"
            :class="{ selectable: canEdit }"
            @click="startEditing"
          >
            {{ modelValue.front || t('card.example.front') }}
          </div>
        </div>
        <div class="flash-card__labels">
          <v-chip
            v-for="label in labels"
            :key="label.docId"
            class="mr-1"
            size="small"
            theme="dark"
            variant="outlined"
          >
            {{ label.label }}
          </v-chip>
        </div>
        <div class="d-flex align-center mb-2">
          <v-btn
            v-if="browse"
            :aria-label="modelValue.learned ? t('card.unlearn') : t('card.learn')"
            :disabled="disabled || !session.online"
            icon
            theme="dark"
            variant="text"
            @click="toggleLearned"
          >
            <v-icon>{{ modelValue.learned ? 'mdi-close' : 'mdi-check' }}</v-icon>
          </v-btn>
          <v-btn
            v-else
            :aria-label="t('common.delete')"
            :disabled="disabled || !session.online"
            icon
            theme="dark"
            variant="text"
            @click="emit('delete', modelValue)"
          >
            <v-icon>mdi-trash-can</v-icon>
          </v-btn>
          <v-spacer />
          <div class="flash-card__number text-body-small">
            {{ number }}
          </div>
          <v-spacer />
          <v-btn
            :aria-label="t('card.flip')"
            icon
            theme="dark"
            variant="text"
            @click="flip"
          >
            <v-icon>mdi-flip-to-back</v-icon>
          </v-btn>
        </div>
      </div>
      <div
        class="flash-card__face flash-card__face--back pa-6"
        :style="{ backgroundColor: faceColor }"
      >
        <div class="flash-card__content">
          <div
            v-if="flipped"
            class="flash-card__text text-headline-small my-4"
            :class="{ selectable: canEdit }"
            @click="startEditing"
          >
            {{ modelValue.back || t('card.example.back') }}
          </div>
        </div>
        <div class="flash-card__labels" />
        <div class="d-flex align-center mb-2">
          <v-spacer />
          <v-btn
            :aria-label="t('card.flip')"
            icon
            theme="dark"
            variant="text"
            @click="flip"
          >
            <v-icon>mdi-flip-to-front</v-icon>
          </v-btn>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useDisplay } from 'vuetify';
import { useI18n } from 'vue-i18n';
import type { FlashCard, Label } from '@/types';
import { shade } from '@/utils/color';
import { useSessionStore } from '@/stores/session';

const props = withDefaults(
  defineProps<{
    modelValue: FlashCard;
    color?: string;
    labels?: Label[];
    browse?: boolean;
    number: number;
    disabled?: boolean;
  }>(),
  { color: '', labels: () => [], browse: false, disabled: false },
);
const emit = defineEmits<{
  'update:modelValue': [card: FlashCard];
  delete: [card: FlashCard];
  check: [learned: boolean];
}>();

const { t } = useI18n();
const { smAndUp } = useDisplay();
const session = useSessionStore();

const flipped = ref(false);
const editing = ref(false);
const textarea = ref<{ focus: () => void } | null>(null);
const cardColor = computed(() => props.color || '#E91E63');
// White text sits on the faces, so they use the AA-safe shade of the set colour.
const faceColor = computed(() => shade(cardColor.value));
const canEdit = computed(() => !props.browse && !props.disabled);

function update<K extends keyof FlashCard>(key: K, value: FlashCard[K]) {
  emit('update:modelValue', { ...props.modelValue, [key]: value });
}

function startEditing() {
  if (canEdit.value) {
    editing.value = true;
  }
}

function toggleLearned() {
  const learned = !props.modelValue.learned;
  update('learned', learned);
  emit('check', learned);
}

function flip() {
  // Review mode: peeking at the answer marks the card as not yet learned.
  if (props.browse && session.online && props.modelValue.learned) {
    update('learned', false);
  }
  editing.value = false;
  flipped.value = !flipped.value;
}
</script>

<style scoped>
.flash-card {
  width: 100%;
  padding: 0 4.25vw;
  perspective: 1000px;
}
.flash-card__inner {
  position: relative;
  width: 100%;
  height: 100%;
  text-align: center;
  border-radius: 28px;
  transform-style: preserve-3d;
  transition: transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.flash-card__inner--flipped {
  transform: rotateY(180deg);
}
.flash-card__inner--learned {
  border-bottom: 4px solid #4caf50;
  border-radius: 28px 28px 32px 32px;
}
.flash-card__inner--unlearned {
  border-bottom: 4px solid #212121;
  border-radius: 28px 28px 32px 32px;
}
.flash-card__face {
  position: absolute;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  color: white;
  border-radius: 28px;
  backface-visibility: hidden;
}
.flash-card__face--back {
  transform: rotateY(180deg);
}
.flash-card__content {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  justify-content: center;
  overflow-x: hidden;
  overflow-y: auto;
}
.flash-card__text {
  white-space: pre-wrap;
  word-break: break-word;
}
.flash-card__labels {
  min-height: 32px;
  overflow: hidden;
  white-space: nowrap;
}
.flash-card__number {
  width: 22px;
  height: 22px;
  border: 1.5px solid white;
  border-radius: 50%;
}
</style>
