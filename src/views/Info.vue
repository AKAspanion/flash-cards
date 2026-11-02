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
    <div class="info__logo">
      <img
        alt=""
        class="info__logo-img"
        src="/images/flash-cards-logo.png"
      >
      <div class="text-headline-small text-uppercase">
        {{ t('info.tagline.title') }}
      </div>
      <div class="text-body-large">
        {{ t('info.tagline.desc') }}
      </div>
    </div>
    <v-card
      class="info__card"
      color="surface-light"
      flat
    >
      <div class="info__content">
        <div class="info__row">
          <v-icon>mdi-glasses</v-icon>
          <div class="info__text">
            <div class="text-title-small">
              {{ t('info.author.title') }}
            </div>
            <div class="text-body-small">
              {{ t('info.author.desc') }}
            </div>
          </div>
        </div>
        <div class="info__row">
          <v-icon>mdi-alpha-v-circle-outline</v-icon>
          <div class="info__text">
            <div class="text-title-small">
              {{ t('info.version.title') }}
            </div>
            <div class="text-body-small">
              {{ version }}
            </div>
          </div>
        </div>
        <div class="info__row">
          <v-icon>mdi-share-variant</v-icon>
          <div class="info__text">
            <div class="text-title-small">
              {{ t('info.share.title') }}
            </div>
            <div class="text-body-small">
              {{ t('info.share.desc') }}
            </div>
          </div>
          <v-btn
            v-if="URLS.play"
            :aria-label="t('info.share.play')"
            icon
            size="small"
            variant="text"
            @click="copyLink('play')"
          >
            <v-icon>mdi-google-play</v-icon>
          </v-btn>
          <v-btn
            :aria-label="t('info.share.web')"
            icon
            size="small"
            variant="text"
            @click="copyLink('web')"
          >
            <v-icon>mdi-web</v-icon>
          </v-btn>
        </div>
        <div
          v-if="URLS.play"
          class="info__row"
        >
          <v-icon>mdi-star</v-icon>
          <div class="info__text">
            <div class="text-title-small">
              {{ t('info.rate.title') }}
            </div>
            <div class="text-body-small">
              {{ t('info.rate.desc') }}
            </div>
          </div>
          <v-btn
            :aria-label="t('info.rate.title')"
            :href="URLS.play"
            icon
            rel="noopener"
            size="small"
            target="_blank"
            variant="text"
          >
            <v-icon>mdi-message-draw</v-icon>
          </v-btn>
        </div>
      </div>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import BarTop from '@/components/BarTop.vue';
import { useSessionStore } from '@/stores/session';

// The web link is wherever the app is served from; the Play Store listing is per deployment (optional).
const URLS = {
  play: import.meta.env.VUE_APP_PLAY_STORE_URL ?? '',
  web: `${window.location.origin}/`,
};

const { t } = useI18n();
const router = useRouter();
const session = useSessionStore();
const version = __APP_VERSION__;

async function copyLink(type: keyof typeof URLS) {
  try {
    await navigator.clipboard.writeText(URLS[type]);
    session.showSnack(type === 'play' ? t('info.copied.play') : t('info.copied.web'));
  } catch {
    session.showSnack(t('info.copied.failed'));
  }
}
</script>

<style scoped>
.info__logo {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 280px;
  text-align: center;
}
.info__logo-img {
  width: 136px;
  padding: 12px;
}
.info__card {
  min-height: calc(100vh - 416px);
  border-bottom-right-radius: 0;
  border-bottom-left-radius: 0;
}
.info__content {
  max-width: 640px;
  padding: 32px 32px 96px;
}
.info__row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding-bottom: 32px;
}
.info__text {
  flex: 1 1 auto;
  padding-left: 24px;
}
</style>
