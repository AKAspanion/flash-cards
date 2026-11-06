<template>
  <!--
    A region named by its text, not a live region: the Resend countdown changes every second, and a live
    region around it would be re-read each tick. (role overrides v-banner's own "banner" landmark, which
    belongs to the page header, not to a notice inside main.)
  -->
  <v-banner
    v-if="shown"
    aria-labelledby="banner-verify-email-text"
    class="banner-verify-email"
    role="region"
  >
    <template #text>
      <span id="banner-verify-email-text">{{ t('verify.banner') }}</span>
    </template>
    <!-- Only the icon takes the brand colour: brand-pink button text on the surface falls short of AA contrast. -->
    <template #prepend>
      <v-icon color="primary">
        mdi-email-alert-outline
      </v-icon>
    </template>
    <template #actions>
      <v-btn
        :disabled="resending || secondsLeft > 0"
        :loading="resending"
        @click="onResend"
      >
        {{ secondsLeft > 0 ? `${t('verify.resend')} (${secondsLeft})` : t('verify.resend') }}
      </v-btn>
      <v-btn
        :loading="checking"
        @click="onCheck"
      >
        {{ t('verify.check') }}
      </v-btn>
    </template>
  </v-banner>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAccountStore } from '@/stores/account';
import { useSessionStore } from '@/stores/session';

// The wait between sends, as in splitify, so repeated presses don't run into Auth's rate limit.
const RESEND_COOLDOWN_SECONDS = 60;

const { t } = useI18n();
const route = useRoute();
const session = useSessionStore();
const account = useAccountStore();

/**
 * A reminder only: it gates nothing, and shows on signed-in screens until the email is verified. Full-height
 * screens (study, editor) opt out, since the banner's height would push their layout off the screen.
 */
const shown = computed(
  () => !!session.user && !session.user.emailVerified && !!route.meta.requireAuth && !route.meta.fullHeight,
);

const resending = ref(false);
const checking = ref(false);
const secondsLeft = ref(0);
let cooldownEnd = 0;
let cooldownTimer: ReturnType<typeof setInterval> | null = null;

function stopCooldown() {
  if (cooldownTimer) {
    clearInterval(cooldownTimer);
    cooldownTimer = null;
  }
}

// Counted from the end time, not by ticks, so a throttled background tab still ends on time.
function tick() {
  secondsLeft.value = Math.max(0, Math.ceil((cooldownEnd - Date.now()) / 1000));
  if (secondsLeft.value === 0) {
    stopCooldown();
  }
}

function startCooldown() {
  stopCooldown();
  cooldownEnd = Date.now() + RESEND_COOLDOWN_SECONDS * 1000;
  tick();
  cooldownTimer = setInterval(tick, 1000);
}

// The store shows every message (sent, offline, rate limit); the banner only drives its buttons.
async function onResend() {
  if (resending.value || secondsLeft.value > 0) {
    return;
  }
  resending.value = true;
  try {
    if (await account.resendVerification()) {
      startCooldown();
    }
  } finally {
    resending.value = false;
  }
}

async function onCheck() {
  if (checking.value) {
    return;
  }
  checking.value = true;
  try {
    // Once verified, the store sets session.user.emailVerified and the banner hides itself.
    await account.checkVerified();
  } finally {
    checking.value = false;
  }
}

onBeforeUnmount(stopCooldown);
</script>
