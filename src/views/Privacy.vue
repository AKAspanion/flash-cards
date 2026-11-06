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
        {{ t('privacy.title') }}
      </h1>
      <p class="text-body-small legal__updated">
        {{ t('privacy.updated') }}
      </p>
      <p class="text-body-large legal__intro">
        {{ t('privacy.intro') }}
      </p>
    </div>
    <v-card
      class="legal__card"
      color="surface-light"
      flat
    >
      <main class="legal__content">
        <div class="legal__row">
          <v-icon>mdi-database-outline</v-icon>
          <div class="legal__text">
            <div class="text-title-small">
              {{ t('privacy.store.title') }}
            </div>
            <ul class="text-body-small">
              <li>{{ t('privacy.store.account') }}</li>
              <li>{{ t('privacy.store.content') }}</li>
              <li>{{ t('privacy.store.settings') }}</li>
            </ul>
          </div>
        </div>
        <div class="legal__row">
          <v-icon>mdi-eye-outline</v-icon>
          <div class="legal__text">
            <div class="text-title-small">
              {{ t('privacy.use.title') }}
            </div>
            <p class="text-body-small">
              {{ t('privacy.use.body') }}
            </p>
          </div>
        </div>
        <div class="legal__row">
          <v-icon>mdi-bullhorn-outline</v-icon>
          <div class="legal__text">
            <div class="text-title-small">
              {{ t('privacy.ads.title') }}
            </div>
            <i18n-t
              keypath="privacy.ads.body"
              tag="p"
              class="text-body-small"
            >
              <template #settings>
                <a
                  href="https://adssettings.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >{{ t('privacy.ads.settingsLink') }}</a>
              </template>
              <template #aboutads>
                <a
                  href="https://www.aboutads.info/choices/"
                  target="_blank"
                  rel="noopener noreferrer"
                >{{ t('privacy.ads.aboutadsLink') }}</a>
              </template>
              <template #partners>
                <a
                  href="https://policies.google.com/technologies/partner-sites"
                  target="_blank"
                  rel="noopener noreferrer"
                >{{ t('privacy.ads.partnersLink') }}</a>
              </template>
            </i18n-t>
          </div>
        </div>
        <div class="legal__row">
          <v-icon>mdi-cloud-outline</v-icon>
          <div class="legal__text">
            <div class="text-title-small">
              {{ t('privacy.where.title') }}
            </div>
            <p class="text-body-small">
              {{ t('privacy.where.body') }}
            </p>
          </div>
        </div>
        <div class="legal__row">
          <v-icon>mdi-delete-outline</v-icon>
          <div class="legal__text">
            <div class="text-title-small">
              {{ t('privacy.delete.title') }}
            </div>
            <p class="text-body-small">
              <template
                v-for="(part, i) in deleteParts"
                :key="i"
              >
                <router-link
                  v-if="i > 0"
                  to="/delete-account"
                >
                  {{ t('links.delete') }}
                </router-link>{{ part }}
              </template>
            </p>
          </div>
        </div>
        <div class="legal__row">
          <v-icon>mdi-account-child-outline</v-icon>
          <div class="legal__text">
            <div class="text-title-small">
              {{ t('privacy.children.title') }}
            </div>
            <p class="text-body-small">
              {{ t('privacy.children.body') }}
            </p>
          </div>
        </div>
        <div class="legal__row">
          <v-icon>mdi-email-outline</v-icon>
          <div class="legal__text">
            <div class="text-title-small">
              {{ t('privacy.contact.title') }}
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
      {{ t('privacy.changes') }}
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
// The link sits inside the sentence, wherever each language puts its words.
const deleteParts = computed(() => t('privacy.delete.body').split(t('links.delete')));
const contactParts = computed(() => t('privacy.contact.body', { email: CONTACT_EMAIL }).split(CONTACT_EMAIL));
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
.legal__text p,
.legal__text ul {
  padding-top: 4px;
}
.legal__text ul {
  padding-left: 20px;
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
