<template>
  <div class="login">
    <div class="login__wrapper">
      <img
        alt=""
        class="login__logo"
        src="/images/flash-cards-logo.png"
      >
      <h1 class="pt-4 text-headline-small text-uppercase">
        {{ t('info.tagline.title') }}
      </h1>
      <div class="pa-2 pb-6 text-body-small">
        {{ isSignIn ? t('login.subtitle.login') : t('login.subtitle.signup') }}
      </div>
      <v-card
        class="login__card"
        elevation="2"
      >
        <v-form
          ref="form"
          @submit.prevent="onSubmit"
        >
          <v-text-field
            v-model="email"
            autocomplete="email"
            autofocus
            class="login__field login__field--first"
            flat
            height="48"
            hide-details
            :label="t('login.email')"
            :rules="[rules.required(t('email.enter')), rules.noSpace(t('rule.space.email'))]"
            type="email"
            variant="solo"
          />
          <v-text-field
            v-model="password"
            :autocomplete="isSignIn ? 'current-password' : 'new-password'"
            class="login__field"
            flat
            height="48"
            hide-details
            :label="t('login.password')"
            :rules="passwordRules"
            type="password"
            variant="solo"
          />
          <v-expand-transition>
            <v-text-field
              v-if="!isSignIn"
              v-model="repassword"
              autocomplete="new-password"
              class="login__field"
              flat
              height="48"
              hide-details
              :label="t('login.repassword')"
              :rules="[...passwordRules, (v: string) => v === password || t('rule.password.match')]"
              type="password"
              variant="solo"
            />
          </v-expand-transition>
          <v-btn
            block
            class="login__submit"
            color="primary"
            flat
            height="48"
            :loading="busy && !googleBusy"
            type="submit"
          >
            {{ isSignIn ? t('login.login') : t('login.signup') }}
          </v-btn>
        </v-form>
      </v-card>
      <div class="text-label-medium text-uppercase py-6">
        {{ t('login.or') }}
      </div>
      <v-btn
        :aria-label="t('login.google')"
        :disabled="busy"
        icon
        :loading="googleBusy"
        :title="t('login.google')"
        variant="text"
        @click="onGoogle"
      >
        <v-icon color="rgb(23, 156, 82)">
          mdi-google
        </v-icon>
      </v-btn>
      <div class="text-body-small py-6">
        {{ isSignIn ? t('login.no-account') : t('login.have-account') }}
        <button
          class="login__link"
          type="button"
          @click="toggleMode"
        >
          {{ isSignIn ? t('login.signup') : t('login.login') }}
        </button>
      </div>
      <div class="text-body-small pb-6 login__legal">
        <router-link
          class="login__link"
          to="/privacy"
        >
          {{ t('links.privacy') }}
        </router-link>
        <router-link
          class="login__link"
          to="/delete-account"
        >
          {{ t('links.delete') }}
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { signInWithEmail, signInWithGoogle, signUpWithEmail } from '@/services/firebase';
import { authErrorMessage, isAuthCancel } from '@/services/authErrors';
import { safeRedirect } from '@/router';
import { useSessionStore } from '@/stores/session';

const MIN_PASSWORD = 6;

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const session = useSessionStore();

const email = ref('');
const password = ref('');
const repassword = ref('');
const isSignIn = ref(true);
const busy = ref(false);
const googleBusy = ref(false);
const form = ref<{ validate: () => Promise<{ valid: boolean; errors: { errorMessages: string[] }[] }> } | null>(null);

const rules = {
  required: (message: string) => (v: string) => !!v || message,
  noSpace: (message: string) => (v: string) => !/\s/.test(v ?? '') || message,
};
const passwordRules = computed(() => [
  rules.required(t('rule.password.required')),
  rules.noSpace(t('rule.space.password')),
  (v: string) => isSignIn.value || (v ?? '').length >= MIN_PASSWORD || t('rule.password.min', { n: MIN_PASSWORD }),
]);

function toggleMode() {
  isSignIn.value = !isSignIn.value;
  repassword.value = '';
}

function goToApp() {
  return router.replace(safeRedirect(route.query.redirect));
}

async function run(action: () => Promise<unknown>, successMessage?: string) {
  busy.value = true;
  try {
    await action();
    if (successMessage) {
      session.showSnack(successMessage);
    }
    await goToApp();
  } catch (err) {
    if (!isAuthCancel(err)) {
      session.showSnack(authErrorMessage(err, t));
    }
  } finally {
    busy.value = false;
  }
}

// Validate on submit rather than disabling the button: password-manager autofill
// often doesn't fire input events, which would leave a disabled button stuck.
async function onSubmit() {
  if (busy.value || !form.value) {
    return;
  }
  const { valid, errors } = await form.value.validate();
  if (!valid) {
    session.showSnack(errors[0]?.errorMessages[0] ?? t('auth.error.generic'));
    return;
  }
  if (isSignIn.value) {
    void run(() => signInWithEmail(email.value, password.value));
  } else if (password.value !== repassword.value) {
    session.showSnack(t('rule.password.match'));
  } else {
    void run(() => signUpWithEmail(email.value, password.value), t('toast.success.sign-up'));
  }
}

// The page leaves for Google, so the button stays loading until it comes back; only a failure
// to start the redirect ends it here.
async function onGoogle() {
  if (busy.value) {
    return;
  }
  busy.value = true;
  googleBusy.value = true;
  try {
    await signInWithGoogle();
  } catch (err) {
    busy.value = false;
    googleBusy.value = false;
    if (!isAuthCancel(err)) {
      session.showSnack(authErrorMessage(err, t));
    }
  }
}

// A failed redirect comes back to this page: show why. A cancelled one shows nothing.
watch(
  () => session.redirectOutcome,
  (outcome) => {
    if (outcome && 'error' in outcome && !isAuthCancel(outcome.error)) {
      session.showSnack(authErrorMessage(outcome.error, t));
    }
  },
  { immediate: true },
);

// Back from Google's page can restore this page from the browser cache with the button still loading.
function resetGoogle(event: PageTransitionEvent) {
  if (event.persisted) {
    busy.value = false;
    googleBusy.value = false;
  }
}
onMounted(() => window.addEventListener('pageshow', resetGoogle));
onBeforeUnmount(() => window.removeEventListener('pageshow', resetGoogle));
</script>

<style scoped>
.login {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: rgb(var(--v-theme-surface-light));
}
.login__wrapper {
  width: calc(100% - 64px);
  max-width: 400px;
  margin: 0 auto;
  text-align: center;
}
.login__logo {
  width: 64px;
}
.login__card {
  overflow: hidden;
}
.login__field :deep(.v-field) {
  border-radius: 0;
}
.login__submit {
  border-radius: 0;
}
.login__legal {
  display: flex;
  justify-content: center;
  gap: 24px;
}
.login__link {
  color: #ba124b;
  font: inherit;
  cursor: pointer;
  background: none;
  border: 0;
}
</style>
