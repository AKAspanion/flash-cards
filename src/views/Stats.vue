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
      <template #center>
        <h1 class="text-title-large text-center">
          {{ t('stats.title') }}
        </h1>
      </template>
    </bar-top>
    <v-card
      class="stats"
      color="surface-light"
      flat
    >
      <container-empty
        v-if="stats.status === 'error'"
        icon="mdi-alert-circle-outline"
        :subtitle="t('empty.error.subtitle')"
        :title="t('empty.error.title')"
      >
        <v-btn
          color="primary"
          rounded="xl"
          @click="stats.load()"
        >
          {{ t('common.retry') }}
        </v-btn>
      </container-empty>
      <div
        v-else
        class="stats__content"
      >
        <div
          class="stats__bars"
          role="group"
          :aria-label="t('stats.title')"
        >
          <div
            v-for="bar in bars"
            :key="bar.day"
            class="stats__bar"
            role="img"
            :aria-label="bar.label"
            :title="bar.label"
          >
            <div
              class="stats__fill"
              :style="{ height: bar.height }"
            />
          </div>
        </div>
        <div class="stats__figures">
          <div
            v-for="figure in figures"
            :key="figure.label"
            class="stats__figure"
          >
            <div class="text-headline-medium">
              {{ figure.value }}
            </div>
            <div class="text-body-medium">
              {{ figure.label }}
            </div>
          </div>
        </div>
      </div>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import BarTop from '@/components/BarTop.vue';
import ContainerEmpty from '@/components/ContainerEmpty.vue';
import { learnedCount } from '@/utils/cardSets';
import { localDate } from '@/utils/dates';
import { lastDays, totalReviewed } from '@/utils/streaks';
import { useLibraryStore } from '@/stores/library';
import { usePrefsStore } from '@/stores/prefs';
import { useStatsStore } from '@/stores/stats';

const DAYS_SHOWN = 30;

const { t } = useI18n();
const router = useRouter();
const stats = useStatsStore();
const library = useLibraryStore();
const prefs = usePrefsStore();

onMounted(() => {
  void stats.load();
  void library.load();
});

const bars = computed(() => {
  const shown = lastDays(stats.days, localDate(), DAYS_SHOWN);
  const most = Math.max(1, ...shown.map((d) => d.count));
  const format = new Intl.DateTimeFormat(prefs.lang, { dateStyle: 'medium' });
  return shown.map(({ day, count }) => {
    const [year, month, date] = day.split('-').map(Number);
    return {
      day,
      label: t('stats.day-bar', { n: count, date: format.format(new Date(year, month - 1, date)) }, count),
      height: count > 0 ? `${Math.max(4, (count / most) * 100)}%` : '2px',
    };
  });
});

const mastered = computed(
  () => library.sets.filter((set) => !set.trashed && set.cards.length > 0 && learnedCount(set) === set.cards.length).length,
);

const figures = computed(() => [
  { label: t('stats.reviewed'), value: totalReviewed(stats.days) },
  { label: t('stats.current-streak'), value: stats.streak },
  { label: t('stats.longest-streak'), value: stats.longestStreak },
  { label: t('stats.mastered'), value: mastered.value },
]);
</script>

<style scoped>
.stats {
  min-height: calc(100vh - 136px);
  border-bottom-right-radius: 0;
  border-bottom-left-radius: 0;
}
.stats__content {
  max-width: 640px;
  padding: 32px 32px 96px;
}
.stats__bars {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 160px;
  margin-bottom: 32px;
}
.stats__bar {
  display: flex;
  flex: 1 1 0;
  align-items: flex-end;
  height: 100%;
  min-width: 0;
}
.stats__fill {
  width: 100%;
  border-radius: 3px 3px 0 0;
  background: rgb(var(--v-theme-primary));
}
.stats__figures {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 24px;
}
</style>
