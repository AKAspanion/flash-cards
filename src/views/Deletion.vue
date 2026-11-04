<template>
  <div>
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
    <main class="legal">
      <h1 class="text-headline-small">
        {{ t('deletion.title') }}
      </h1>
      <p class="text-body-large">
        {{ t('deletion.intro') }}
      </p>
      <p class="text-body-large">
        <strong>{{ t('deletion.app.title') }}</strong>
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

      <h2 class="text-title-medium">
        {{ t('deletion.email.title') }}
      </h2>
      <p class="text-body-large">
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
    </main>
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
.legal {
  max-width: 640px;
  padding: 16px 32px 96px;
}
.legal h2 {
  padding-top: 24px;
}
.legal p {
  padding-top: 8px;
}
.legal__action {
  margin-top: 16px;
}
.legal a:not(.v-btn) {
  color: #ba124b;
}
</style>
