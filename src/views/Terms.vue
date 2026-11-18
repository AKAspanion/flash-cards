<template>
  <div class="legal">
    <bar-top @click:left="router.push(backPath)">
      <template #left-button>
        <v-icon
          color="primary"
          size="32"
        >
          mdi-arrow-left
        </v-icon>
      </template>
      <template #left-text>
        {{ session.user ? t('common.home') : t('login.login') }}
      </template>
    </bar-top>
    <div class="legal__head">
      <h1 class="text-headline-small">
        {{ t('terms.title') }}
      </h1>
      <p class="text-body-small legal__updated">
        {{ t('terms.updated') }}
      </p>
      <p class="text-body-large legal__intro">
        {{ t('terms.intro') }}
      </p>
    </div>
    <v-card
      class="legal__card"
      color="surface-light"
      flat
    >
      <main class="legal__content">
        <div class="legal__row">
          <v-icon>mdi-account-check-outline</v-icon>
          <div class="legal__text">
            <div class="text-title-small">
              {{ t('terms.who.title') }}
            </div>
            <p class="text-body-small">
              {{ t('terms.who.body') }}
            </p>
          </div>
        </div>
        <div class="legal__row">
          <v-icon>mdi-cards-outline</v-icon>
          <div class="legal__text">
            <div class="text-title-small">
              {{ t('terms.yours.title') }}
            </div>
            <p class="text-body-small">
              <template
                v-for="(part, i) in yoursParts"
                :key="i"
              >
                <router-link
                  v-if="i > 0"
                  to="/privacy"
                >{{ t('links.privacy') }}</router-link>{{ part }}
              </template>
            </p>
          </div>
        </div>
        <div class="legal__row">
          <v-icon>mdi-share-variant-outline</v-icon>
          <div class="legal__text">
            <div class="text-title-small">
              {{ t('terms.sharing.title') }}
            </div>
            <p class="text-body-small">
              {{ t('terms.sharing.body') }}
            </p>
          </div>
        </div>
        <div class="legal__row">
          <v-icon>mdi-cancel</v-icon>
          <div class="legal__text">
            <div class="text-title-small">
              {{ t('terms.rules.title') }}
            </div>
            <p class="text-body-small">
              {{ t('terms.rules.body') }}
            </p>
          </div>
        </div>
        <div class="legal__row">
          <v-icon>mdi-account-cancel-outline</v-icon>
          <div class="legal__text">
            <div class="text-title-small">
              {{ t('terms.enforce.title') }}
            </div>
            <p class="text-body-small">
              {{ t('terms.enforce.body') }}
            </p>
          </div>
        </div>
        <div class="legal__row">
          <v-icon>mdi-alert-circle-outline</v-icon>
          <div class="legal__text">
            <div class="text-title-small">
              {{ t('terms.warranty.title') }}
            </div>
            <p class="text-body-small">
              {{ t('terms.warranty.body') }}
            </p>
          </div>
        </div>
        <div class="legal__row">
          <v-icon>mdi-scale-balance</v-icon>
          <div class="legal__text">
            <div class="text-title-small">
              {{ t('terms.law.title') }}
            </div>
            <p class="text-body-small">
              {{ t('terms.law.body') }}
            </p>
          </div>
        </div>
        <div class="legal__row">
          <v-icon>mdi-email-outline</v-icon>
          <div class="legal__text">
            <div class="text-title-small">
              {{ t('terms.contact.title') }}
            </div>
            <p class="text-body-small">
              <template
                v-for="(part, i) in contactParts"
                :key="i"
              >
                <a
                  v-if="i > 0"
                  :href="`mailto:${CONTACT_EMAIL}`"
                >{{ CONTACT_EMAIL }}</a>{{ part }}
              </template>
            </p>
          </div>
        </div>
      </main>
    </v-card>
    <p class="text-body-small legal__changes">
      {{ t('terms.changes') }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import BarTop from '@/components/BarTop.vue';
import { CONTACT_EMAIL } from '@/utils/contact';
import { useSessionStore } from '@/stores/session';

const { t } = useI18n();
const router = useRouter();
const session = useSessionStore();

const backPath = computed(() => (session.user ? '/home' : '/login'));
// The links sit inside the sentence, wherever each language puts its words.
const yoursParts = computed(() => t('terms.yours.body').split(t('links.privacy')));
const contactParts = computed(() => t('terms.contact.body', { email: CONTACT_EMAIL }).split(CONTACT_EMAIL));
</script>

<style scoped>
.legal__head {
  max-width: 640px;
  padding: 16px 32px 24px;
}
.legal__card {
  border-bottom-right-radius: 0;
  border-bottom-left-radius: 0;
}
.legal__content {
  max-width: 640px;
  padding: 32px 32px 32px;
}
.legal__row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding-bottom: 32px;
}
.legal__row:last-child {
  padding-bottom: 0;
}
.legal__text {
  flex: 1 1 auto;
  padding-left: 24px;
}
.legal__text p {
  padding-top: 4px;
}
.legal a:not(.v-btn) {
  color: #ba124b;
}
.legal__updated {
  padding-top: 4px;
  opacity: 0.8;
}
.legal__intro {
  padding-top: 16px;
}
.legal__changes {
  max-width: 640px;
  padding: 16px 32px 96px;
}
</style>
