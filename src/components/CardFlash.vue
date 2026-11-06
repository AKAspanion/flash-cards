<template>
  <div
    class="flash-card my-8"
    :style="{ '--card-height': cardHeight, height: cardHeight }"
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
          @keydown.tab.exact="onTab"
          @keydown.enter.ctrl="onSaveShortcut"
          @keydown.enter.meta="onSaveShortcut"
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
        <div
          v-if="!browse"
          class="d-flex justify-space-between mt-4"
        >
          <v-btn
            :color="cardColor"
            prepend-icon="mdi-image-plus"
            variant="text"
            @click="openImage"
          >
            {{ t('card.image.insert') }}
          </v-btn>
          <v-btn
            v-if="!flipped"
            :color="cardColor"
            variant="tonal"
            @click="nextSide"
          >
            {{ t('card.next-side') }}
          </v-btn>
          <v-btn
            v-else
            :color="cardColor"
            variant="tonal"
            @click="saveAndAddNext"
          >
            {{ t('card.save-next') }}
          </v-btn>
        </div>
      </v-card>
    </v-dialog>
    <v-dialog
      v-model="imageOpen"
      max-width="420"
      @after-enter="imageField?.focus()"
    >
      <v-card class="pa-6">
        <v-text-field
          ref="imageField"
          v-model="imageUrl"
          :error-messages="imageError ? [t('card.image.https')] : []"
          :label="t('card.image.url')"
          type="url"
          variant="outlined"
          @keydown.enter.prevent="insertImage"
          @update:model-value="imageError = false"
        />
        <div class="d-flex justify-end">
          <v-btn
            :color="cardColor"
            variant="tonal"
            @click="insertImage"
          >
            {{ t('card.image.confirm') }}
          </v-btn>
        </div>
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
          <!-- eslint-disable vue/no-v-html -- renderCardText is the only sanitizer; it never returns unsanitized HTML -->
          <div
            v-if="!flipped && modelValue.front"
            class="flash-card__text text-headline-small my-4"
            :class="{ selectable: canEdit }"
            @click="onTextClick"
            v-html="renderCardText(modelValue.front)"
          />
          <!-- eslint-enable vue/no-v-html -->
          <div
            v-else-if="!flipped"
            class="flash-card__text text-headline-small my-4"
            :class="{ selectable: canEdit }"
            @click="onTextClick"
          >
            {{ t('card.example.front') }}
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
        <div
          v-if="showRating && !flipped"
          class="flash-card__rating d-flex justify-center flex-wrap ga-2 mb-2"
        >
          <v-btn
            v-for="r in RATINGS"
            :key="r"
            :color="cardColor"
            theme="dark"
            variant="flat"
            @click="rate(r)"
          >
            {{ t(`srs.${r}`) }}
          </v-btn>
        </div>
        <div class="d-flex align-center mb-2">
          <v-btn
            v-if="browse"
            :aria-label="modelValue.learned ? t('card.unlearn') : t('card.learn')"
            :disabled="disabled"
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
            :disabled="disabled"
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
            v-if="browse && canSpeak"
            :aria-label="t('card.read-aloud')"
            icon
            theme="dark"
            variant="text"
            @click="readAloud"
          >
            <v-icon>mdi-volume-high</v-icon>
          </v-btn>
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
          <!-- eslint-disable vue/no-v-html -- renderCardText is the only sanitizer; it never returns unsanitized HTML -->
          <div
            v-if="flipped && modelValue.back"
            class="flash-card__text text-headline-small my-4"
            :class="{ selectable: canEdit }"
            @click="onTextClick"
            v-html="renderCardText(modelValue.back)"
          />
          <!-- eslint-enable vue/no-v-html -->
          <div
            v-else-if="flipped"
            class="flash-card__text text-headline-small my-4"
            :class="{ selectable: canEdit }"
            @click="onTextClick"
          >
            {{ t('card.example.back') }}
          </div>
        </div>
        <div class="flash-card__labels" />
        <div
          v-if="showRating && flipped"
          class="flash-card__rating d-flex justify-center flex-wrap ga-2 mb-2"
        >
          <v-btn
            v-for="r in RATINGS"
            :key="r"
            :color="cardColor"
            theme="dark"
            variant="flat"
            @click="rate(r)"
          >
            {{ t(`srs.${r}`) }}
          </v-btn>
        </div>
        <div class="d-flex align-center mb-2">
          <v-spacer />
          <v-btn
            v-if="browse && canSpeak"
            :aria-label="t('card.read-aloud')"
            icon
            theme="dark"
            variant="text"
            @click="readAloud"
          >
            <v-icon>mdi-volume-high</v-icon>
          </v-btn>
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
import { computed, nextTick, ref, watch } from 'vue';
import { useDisplay } from 'vuetify';
import { useI18n } from 'vue-i18n';
import type { FlashCard, Label, SpeechLanguages } from '@/types';
import { shade } from '@/utils/color';
import { cardPlainText, renderCardText } from '@/utils/markdown';
import { speak, speechAvailable } from '@/utils/speech';
import type { Rating } from '@/utils/srs';

const RATINGS: Rating[] = ['again', 'hard', 'good', 'easy'];

const props = withDefaults(
  defineProps<{
    modelValue: FlashCard;
    color?: string;
    labels?: Label[];
    browse?: boolean;
    number: number;
    disabled?: boolean;
    /** Starts the card on its back face; the front text still sits on the front face. */
    reverse?: boolean;
    /** Shows the four rating buttons once the card has been flipped. */
    rating?: boolean;
    /** Read-aloud language per side; a missing side uses the browser default. */
    speech?: SpeechLanguages;
  }>(),
  { color: '', labels: () => [], browse: false, disabled: false, reverse: false, rating: false, speech: undefined },
);
const emit = defineEmits<{
  'update:modelValue': [card: FlashCard];
  delete: [card: FlashCard];
  check: [learned: boolean];
  rate: [rating: Rating];
  /** Edit mode only: the text dialog asked for a new card right after this one. */
  'add-after': [card: FlashCard];
}>();

const { t } = useI18n();
const { smAndUp } = useDisplay();

const flipped = ref(props.reverse);
// Revealed once flipped at least once, from either starting face.
const revealed = ref(false);
const showRating = computed(() => props.rating && revealed.value);
const editing = ref(false);
const textarea = ref<{ focus: () => void; $el: HTMLElement } | null>(null);
const imageField = ref<{ focus: () => void } | null>(null);
const imageOpen = ref(false);
const imageUrl = ref('');
const imageError = ref(false);
// Where the caret was when the image dialog opened; the dialog takes the focus away from the textarea.
let imageCaret: number | null = null;
const canSpeak = speechAvailable();
const cardHeight = computed(() => (props.browse ? 'calc(100vh - 224px)' : 'calc(100vh - 320px)'));
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

/** A click on a link in the text opens the link; it never opens the text dialog. */
function onTextClick(event: MouseEvent) {
  if (event.target instanceof Element && event.target.closest('a')) {
    return;
  }
  startEditing();
}

function innerTextarea(): HTMLTextAreaElement | null {
  return textarea.value?.$el.querySelector('textarea') ?? null;
}

function openImage() {
  imageCaret = innerTextarea()?.selectionStart ?? null;
  imageUrl.value = '';
  imageError.value = false;
  imageOpen.value = true;
}

/** Parses `value` and returns its canonical form when it is an absolute https: address. */
function httpsAddress(value: string): string | null {
  try {
    const url = new URL(value.trim());
    // Parentheses would end the Markdown image early.
    return url.protocol === 'https:' ? url.href.replace(/\(/g, '%28').replace(/\)/g, '%29') : null;
  } catch {
    return null;
  }
}

function insertImage() {
  const address = httpsAddress(imageUrl.value);
  if (!address) {
    imageError.value = true;
    return;
  }
  const side = flipped.value ? 'back' : 'front';
  const text = props.modelValue[side];
  const at = imageCaret === null ? text.length : Math.min(imageCaret, text.length);
  update(side, `${text.slice(0, at)}![](${address})${text.slice(at)}`);
  imageOpen.value = false;
  void nextTick(() => textarea.value?.focus());
}

function readAloud() {
  const side = flipped.value ? 'back' : 'front';
  speak(cardPlainText(props.modelValue[side]), props.speech?.[side]);
}

function nextSide() {
  flipped.value = true;
  // The textarea stays mounted, so it keeps focus; this covers a focus lost to the button click.
  void nextTick(() => textarea.value?.focus());
}

function onTab(event: KeyboardEvent) {
  if (!flipped.value && !props.browse) {
    event.preventDefault();
    nextSide();
  }
}

function saveAndAddNext() {
  if (props.browse) {
    return;
  }
  editing.value = false;
  emit('add-after', props.modelValue);
}

function onSaveShortcut(event: KeyboardEvent) {
  if (flipped.value && !props.browse) {
    event.preventDefault();
    saveAndAddNext();
  }
}

/** Shows `side` and opens the text dialog on it, for the next card to be typed straight into. */
function edit(side: 'front' | 'back') {
  if (!canEdit.value) {
    return;
  }
  flipped.value = side === 'back';
  editing.value = true;
}

function toggleLearned() {
  const learned = !props.modelValue.learned;
  update('learned', learned);
  emit('check', learned);
}

watch(
  () => props.reverse,
  (reverse) => {
    editing.value = false;
    flipped.value = reverse;
    revealed.value = false;
  },
);

function flip() {
  editing.value = false;
  flipped.value = !flipped.value;
  revealed.value = true;
}

/** Emits `rating` when the rating row is showing; false (and nothing emitted) before the card is revealed. */
function rate(rating: Rating): boolean {
  if (!showRating.value) {
    return false;
  }
  emit('rate', rating);
  return true;
}

defineExpose({ flip, edit, rate, readAloud });
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
  max-width: 100%;
  word-break: break-word;
}
.flash-card__text :deep(p) {
  margin: 0 0 0.5em;
}
.flash-card__text :deep(p:last-child) {
  margin-bottom: 0;
}
.flash-card__text :deep(ul),
.flash-card__text :deep(ol) {
  padding-left: 1.5em;
  text-align: left;
}
.flash-card__text :deep(a) {
  color: inherit;
  text-decoration: underline;
}
.flash-card__text :deep(pre) {
  padding: 8px 12px;
  overflow-x: auto;
  text-align: left;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 8px;
}
.flash-card__text :deep(code) {
  font-family: ui-monospace, monospace;
  font-size: 0.9em;
}
.flash-card__text :deep(img) {
  width: auto;
  max-width: 100%;
  height: auto;
  max-height: calc(var(--card-height) * 0.4);
  object-fit: contain;
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
  line-height: inherit;
}
</style>
