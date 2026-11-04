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
        {{ t('privacy.title') }}
      </h1>
      <p class="text-body-small legal__updated">
        {{ t('privacy.updated') }}
      </p>
      <p class="text-body-large">
        {{ t('privacy.intro') }}
      </p>

      <h2 class="text-title-medium">
        {{ t('privacy.store.title') }}
      </h2>
      <ul class="text-body-large">
        <li>{{ t('privacy.store.account') }}</li>
        <li>{{ t('privacy.store.content') }}</li>
        <li>{{ t('privacy.store.settings') }}</li>
      </ul>

      <h2 class="text-title-medium">
        {{ t('privacy.use.title') }}
      </h2>
      <p class="text-body-large">
        {{ t('privacy.use.body') }}
      </p>

      <h2 class="text-title-medium">
        {{ t('privacy.where.title') }}
      </h2>
      <p class="text-body-large">
        {{ t('privacy.where.body') }}
      </p>

      <h2 class="text-title-medium">
        {{ t('privacy.delete.title') }}
      </h2>
      <p class="text-body-large">
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

      <h2 class="text-title-medium">
        {{ t('privacy.children.title') }}
      </h2>
      <p class="text-body-large">
        {{ t('privacy.children.body') }}
      </p>

      <h2 class="text-title-medium">
        {{ t('privacy.contact.title') }}
      </h2>
      <p class="text-body-large">
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

      <p class="text-body-large">
        {{ t('privacy.changes') }}
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
// The link sits inside the sentence, wherever each language puts its words.
const deleteParts = computed(() => t('privacy.delete.body').split(t('links.delete')));
const contactParts = computed(() => t('privacy.contact.body', { email: CONTACT_EMAIL }).split(CONTACT_EMAIL));
</script>

<style scoped>
.legal {
  max-width: 640px;
  padding: 16px 32px 96px;
}
.legal h2 {
  padding-top: 24px;
}
.legal p,
.legal ul {
  padding-top: 8px;
}
.legal ul {
  padding-left: 20px;
}
.legal__updated {
  opacity: 0.8;
}
.legal a {
  color: #ba124b;
}
</style>
