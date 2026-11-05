<template>
  <div>
    <bar-top @click:left="router.push('/home')">
      <template #left-button>
        <v-icon
          color="primary"
          size="32"
        >
          mdi-arrow-left
        </v-icon>
      </template>
      <template #left-text>
        {{ t('common.home') }}
      </template>
    </bar-top>
    <v-card
      class="settings"
      color="surface-light"
      flat
    >
      <div class="settings__content">
        <div class="settings__row">
          <v-icon>mdi-translate</v-icon>
          <div class="settings__text">
            <div class="text-body-large">
              {{ t('settings.language.title') }}
            </div>
            <div class="text-body-small">
              {{ t('settings.language.desc') }}
            </div>
          </div>
          <v-btn-toggle
            v-model="prefs.lang"
            color="primary"
            density="compact"
            divided
            mandatory
            rounded="xl"
            variant="outlined"
          >
            <v-btn
              size="small"
              value="en"
            >
              en
            </v-btn>
            <v-btn
              size="small"
              value="hi"
            >
              ही
            </v-btn>
          </v-btn-toggle>
        </div>
        <div class="settings__row">
          <v-icon>mdi-brightness-4</v-icon>
          <div class="settings__text">
            <div class="text-body-large">
              {{ t('settings.theme.title') }}
            </div>
            <div class="text-body-small">
              {{ t('settings.theme.desc') }}
            </div>
          </div>
          <v-btn-toggle
            v-model="prefs.dark"
            color="primary"
            density="compact"
            divided
            mandatory
            rounded="xl"
            variant="outlined"
          >
            <v-btn
              :aria-label="t('settings.theme.light')"
              size="small"
              :value="false"
            >
              <v-icon size="small">
                mdi-white-balance-sunny
              </v-icon>
            </v-btn>
            <v-btn
              :aria-label="t('settings.theme.dark')"
              size="small"
              :value="true"
            >
              <v-icon
                size="small"
                style="transform: rotate(-45deg)"
              >
                mdi-moon-waning-crescent
              </v-icon>
            </v-btn>
          </v-btn-toggle>
        </div>
        <div class="settings__row">
          <v-icon>mdi-star</v-icon>
          <div class="settings__text">
            <div class="text-body-large">
              {{ t('settings.favourite.title') }}
            </div>
            <div class="text-body-small">
              {{ t('settings.favourite.desc') }}
            </div>
          </div>
          <v-switch
            v-model="prefs.favOnTop"
            :aria-label="t('settings.favourite.title')"
            color="primary"
            hide-details
            inset
          />
        </div>
        <div class="settings__row settings__row--stacked">
          <div class="d-flex align-start">
            <v-icon>mdi-card-text-outline</v-icon>
            <div class="settings__text">
              <div class="text-body-large">
                {{ t('settings.card-set.title') }}
              </div>
              <div class="text-body-small">
                {{ t('settings.card-set.desc') }}
              </div>
            </div>
          </div>
          <v-select
            v-model="prefs.setOrder"
            :aria-label="t('settings.card-set.title')"
            class="settings__select"
            density="compact"
            hide-details
            item-title="label"
            item-value="value"
            :items="orderItems"
            :list-props="orderListProps"
            rounded="xl"
            variant="outlined"
          />
        </div>
        <div class="settings__row settings__row--stacked">
          <div class="d-flex align-start">
            <v-icon>mdi-flag-checkered</v-icon>
            <div class="settings__text">
              <div class="text-body-large">
                {{ t('settings.goal.title') }}
              </div>
            </div>
          </div>
          <v-select
            :aria-label="t('settings.goal.title')"
            class="settings__select"
            density="compact"
            :disabled="stats.status !== 'ready'"
            hide-details
            :items="goalItems"
            :list-props="goalListProps"
            :model-value="stats.goal"
            rounded="xl"
            variant="outlined"
            @update:model-value="changeGoal"
          />
        </div>
        <div class="settings__row settings__row--stacked">
          <div class="d-flex align-start">
            <v-icon>mdi-bell-outline</v-icon>
            <div class="settings__text">
              <div class="text-body-large">
                {{ t('settings.reminder.title') }}
              </div>
              <div class="text-body-small">
                {{ t('settings.reminder.desc') }}
              </div>
            </div>
          </div>
          <div class="settings__reminder">
            <v-text-field
              :aria-label="t('settings.reminder.title')"
              density="compact"
              hide-details
              :model-value="reminderField"
              rounded="xl"
              type="time"
              variant="outlined"
              @update:model-value="changeReminderTime"
            />
            <v-btn
              color="primary"
              :disabled="!reminderValid"
              variant="outlined"
              @click="addReminder"
            >
              {{ t('settings.reminder.add') }}
            </v-btn>
          </div>
        </div>
        <div class="settings__row">
          <v-icon>mdi-download</v-icon>
          <div class="settings__text">
            <div class="text-body-large">
              {{ t('settings.backup.title') }}
            </div>
            <div class="text-body-small">
              {{ t('settings.backup.desc') }}
            </div>
          </div>
          <v-btn
            :aria-label="t('settings.backup.title')"
            color="primary"
            icon
            size="small"
            variant="outlined"
            @click="backUp"
          >
            <v-icon>mdi-download</v-icon>
          </v-btn>
        </div>
        <div class="settings__row">
          <v-icon>mdi-upload</v-icon>
          <div class="settings__text">
            <div class="text-body-large">
              {{ t('settings.restore.title') }}
            </div>
            <div class="text-body-small">
              {{ t('settings.restore.desc') }}
            </div>
          </div>
          <v-btn
            :aria-label="t('settings.restore.title')"
            color="primary"
            icon
            :loading="restoring"
            size="small"
            variant="outlined"
            @click="chooseBackup"
          >
            <v-icon>mdi-upload</v-icon>
          </v-btn>
          <input
            ref="fileInput"
            accept=".json,application/json"
            aria-hidden="true"
            class="settings__file"
            tabindex="-1"
            type="file"
            @change="restore"
          >
        </div>
      </div>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import BarTop from '@/components/BarTop.vue';
import { usePrefsStore } from '@/stores/prefs';
import { useLibraryStore } from '@/stores/library';
import { useSessionStore } from '@/stores/session';
import { useStatsStore } from '@/stores/stats';
import { DAILY_GOALS } from '@/types';
import { randomId, uid } from '@/utils/cardSets';
import { backupFileName, buildBackup, parseBackup } from '@/utils/cardExport';
import { downloadText } from '@/utils/download';
import { buildDailyReminderIcs, isReminderTime, REMINDER_FILE_NAME } from '@/utils/ics';
import type { CardSet } from '@/types';

const { t } = useI18n();
const router = useRouter();
const prefs = usePrefsStore();
const library = useLibraryStore();
const session = useSessionStore();
const stats = useStatsStore();

onMounted(() => void stats.load());

const fileInput = ref<HTMLInputElement | null>(null);
const restoring = ref(false);

const orderListProps = computed(() => ({ 'aria-label': t('settings.card-set.title') }) as Record<string, string>);

const goalListProps = computed(() => ({ 'aria-label': t('settings.goal.title') }) as Record<string, string>);

/** The select is bound to the stored goal, so a refused save leaves the kept goal showing. */
const goalItems: number[] = [...DAILY_GOALS];

async function changeGoal(goal: number | null) {
  if (goal !== null) {
    await stats.setGoal(goal);
  }
}

const orderItems =computed(() => [
  { label: t('settings.order-items.al'), value: 'Alphabetically' },
  { label: t('settings.order-items.nf'), value: 'New first' },
  { label: t('settings.order-items.of'), value: 'Old first' },
  { label: t('settings.order-items.progress'), value: 'Progress' },
  { label: t('settings.order-items.rs'), value: 'Recently studied' },
]);

/** The field's own text, so an incomplete time can show without being stored. */
const reminderField = ref(prefs.reminderTime);
const reminderValid = computed(() => isReminderTime(reminderField.value));

function changeReminderTime(value: string | null) {
  reminderField.value = value ?? '';
  if (isReminderTime(reminderField.value)) {
    prefs.reminderTime = reminderField.value;
  }
}

function addReminder() {
  if (!isReminderTime(reminderField.value)) {
    return;
  }
  const ics = buildDailyReminderIcs({
    time: reminderField.value,
    summary: t('reminder.summary'),
    url: `${window.location.origin}/`,
    now: new Date(),
    uid: `${randomId()}@flashcards`,
  });
  downloadText(REMINDER_FILE_NAME, ics, 'text/calendar;charset=utf-8');
}

async function backUp() {
  // The library may still be loading when Settings is opened directly.
  await library.load();
  if (library.status !== 'ready') {
    return;
  }
  const now = new Date();
  const backup = buildBackup(library.sets, library.labels, now);
  downloadText(backupFileName(now), JSON.stringify(backup, null, 2), 'application/json');
}

function chooseBackup() {
  if (!session.online) {
    session.showSnack(t('toast.offline-save'));
    return;
  }
  fileInput.value?.click();
}

/** Adds the backup's sets as new sets; labels are matched by their text and created when missing. */
async function restore(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file || restoring.value) {
    return;
  }
  if (!session.online) {
    session.showSnack(t('toast.offline-save'));
    return;
  }
  const backup = parseBackup(await file.text().catch(() => ''));
  if (!backup) {
    session.showSnack(t('toast.error.not-backup'));
    return;
  }
  restoring.value = true;
  try {
    await library.load();
    if (library.status !== 'ready') {
      return;
    }
    // Backup label id -> id of the label with the same text in this account.
    const labelIds = new Map<string, string>();
    const byText = new Map(library.labels.map((l) => [l.label, l.docId]));
    for (const label of backup.labels) {
      let docId = byText.get(label.label);
      if (!docId) {
        docId = (await library.createLabel(label.label))?.docId;
        if (docId) {
          byText.set(label.label, docId);
        }
      }
      if (docId) {
        labelIds.set(label.docId, docId);
      }
    }
    let created = 0;
    for (const source of backup.sets) {
      const date = new Date(source.date);
      const set: CardSet = {
        id: uid(),
        title: source.title,
        color: source.color,
        date: Number.isNaN(date.getTime()) ? new Date() : date,
        trashed: false,
        fav: source.fav,
        labels: source.labels.flatMap((id) => labelIds.get(id) ?? []),
        cards: source.cards,
        ...(source.speech ? { speech: source.speech } : {}),
      };
      if (await library.createSet(set)) {
        created++;
      }
    }
    if (created > 0 || backup.sets.length === 0) {
      session.showSnack(t('toast.restored', { n: created }, created));
    }
  } finally {
    restoring.value = false;
  }
}
</script>

<style scoped>
.settings {
  min-height: calc(100vh - 136px);
  border-bottom-right-radius: 0;
  border-bottom-left-radius: 0;
}
.settings__content {
  max-width: 640px;
  padding: 32px 32px 96px;
}
.settings__row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-bottom: 24px;
}
.settings__row--stacked {
  flex-direction: column;
  align-items: stretch;
}
.settings__text {
  flex: 1 1 auto;
  padding-left: 16px;
}
.settings__file {
  display: none;
}
.settings__reminder {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  margin-left: 40px;
}
.settings__select {
  margin-left: 40px;
}
</style>
