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
        {{ t('deletion.title') }}
      </h1>
    </div>
    <v-card
      class="legal__card"
      color="surface-light"
      flat
    >
      <main class="legal__content">
        <div class="legal__row">
          <v-icon>mdi-delete-forever-outline</v-icon>
          <div class="legal__text">
            <div class="text-title-small">
              {{ t('deletion.what.title') }}
            </div>
            <p class="text-body-small">
              {{ t('deletion.intro') }}
            </p>
          </div>
        </div>
        <div class="legal__row">
          <v-icon>mdi-account-cog-outline</v-icon>
          <div class="legal__text">
            <div class="text-title-small">
              {{ t('deletion.app.title') }}
            </div>
            <p class="text-body-small">
              {{ t('deletion.app.body') }}
            </p>
            <v-btn
              class="legal__action"
              color="primary"
              flat
              height="48"
              :to="session.user ? '/profile' : '/login?redirect=/profile'"
            >
              {{ session.user ? t('deletion.profile') : t('deletion.signin') }}
            </v-btn>
          </div>
        </div>
        <div class="legal__row">
          <v-icon>mdi-email-outline</v-icon>
          <div class="legal__text">
            <div class="text-title-small">
              {{ t('deletion.email.title') }}
            </div>
            <p class="text-body-small">
              <template
                v-for="(part, i) in emailParts"
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
const emailParts = computed(() => t('deletion.email.body', { email: CONTACT_EMAIL }).split(CONTACT_EMAIL));
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
.legal__action {
  margin-top: 16px;
}
</style>
