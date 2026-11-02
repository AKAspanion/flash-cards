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
            class="settings__select"
            density="compact"
            hide-details
            item-title="label"
            item-value="value"
            :items="orderItems"
            rounded="xl"
            variant="outlined"
          />
        </div>
      </div>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import BarTop from '@/components/BarTop.vue';
import { usePrefsStore } from '@/stores/prefs';

const { t } = useI18n();
const router = useRouter();
const prefs = usePrefsStore();

const orderItems = computed(() => [
  { label: t('settings.order-items.al'), value: 'Alphabetically' },
  { label: t('settings.order-items.nf'), value: 'New first' },
  { label: t('settings.order-items.of'), value: 'Old first' },
]);
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
.settings__select {
  margin-left: 40px;
}
</style>
