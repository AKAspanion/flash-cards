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
        {{ t(SUBTITLE_KEYS[mode]) }}
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
            :autofocus="finePointer"
            class="login__field login__field--first"
            flat
            height="48"
            hide-details
            :label="t('login.email')"
            :rules="emailRules"
            type="email"
            variant="solo"
          />
          <v-text-field
            v-if="mode !== 'reset'"
            v-model="password"
            :autocomplete="mode === 'signIn' ? 'current-password' : 'new-password'"
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
              v-if="mode === 'signUp'"
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
            {{ t(SUBMIT_KEYS[mode]) }}
          </v-btn>
        </v-form>
      </v-card>
      <div
        v-if="mode === 'signIn'"
        class="text-body-small pt-4"
      >
        <button
          class="login__link"
          :disabled="busy"
          type="button"
          @click="setMode('reset')"
        >
          {{ t('login.forgot') }}
        </button>
      </div>
      <div
        v-if="mode === 'reset'"
        class="text-body-small py-6"
      >
        <button
          class="login__link"
          :disabled="busy"
          type="button"
          @click="setMode('signIn')"
        >
          {{ t('login.reset.back') }}
        </button>
      </div>
      <template v-else>
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
          {{ mode === 'signIn' ? t('login.no-account') : t('login.have-account') }}
          <button
            class="login__link"
            :disabled="busy"
            type="button"
            @click="setMode(mode === 'signIn' ? 'signUp' : 'signIn')"
          >
            {{ mode === 'signIn' ? t('login.signup') : t('login.login') }}
          </button>
        </div>
      </template>
      <div class="text-body-small pb-6 login__legal">
        <router-link
          class="login__link"
          to="/privacy"
        >
          {{ t('links.privacy') }}
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { sendPasswordReset, signInWithEmail, signInWithGoogle, signUpWithEmail } from '@/services/firebase';
import { authErrorMessage, isAuthCancel } from '@/services/authErrors';
import { safeRedirect } from '@/router';
import { useSessionStore } from '@/stores/session';

const MIN_PASSWORD = 6;

type Mode = 'signIn' | 'signUp' | 'reset';
const SUBTITLE_KEYS: Record<Mode, string> = {
  signIn: 'login.subtitle.login',
  signUp: 'login.subtitle.signup',
  reset: 'login.subtitle.reset',
};
const SUBMIT_KEYS: Record<Mode, string> = {
  signIn: 'login.login',
  signUp: 'login.signup',
  reset: 'login.reset.send',
};

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const session = useSessionStore();

// A touch keyboard popping open over the sign-in screen hides it, so focus the field only with a mouse.
const finePointer = !window.matchMedia('(pointer: coarse)').matches;

const email = ref('');
const password = ref('');
const repassword = ref('');
const mode = ref<Mode>('signIn');
const busy = ref(false);
const googleBusy = ref(false);
const form = ref<{ validate: () => Promise<{ valid: boolean; errors: { errorMessages: string[] }[] }> } | null>(null);

const rules = {
  required: (message: string) => (v: string) => !!v || message,
  noSpace: (message: string) => (v: string) => !/\s/.test(v ?? '') || message,
  emailShape: (message: string) => (v: string) => /^[^@\s]+@[^@\s]+$/.test(v ?? '') || message,
};
// Sign-in and sign-up get "not a valid email" from Firebase. A reset request can't rely on that:
// the Auth emulator answers a malformed address as an unknown one, which reads as "link sent".
const emailRules = computed(() => [
  rules.required(t('email.enter')),
  rules.noSpace(t('rule.space.email')),
  ...(mode.value === 'reset' ? [rules.emailShape(t('auth.error.invalid-email'))] : []),
]);
const passwordRules = computed(() => [
  rules.required(t('rule.password.required')),
  rules.noSpace(t('rule.space.password')),
  (v: string) => mode.value !== 'signUp' || (v ?? '').length >= MIN_PASSWORD || t('rule.password.min', { n: MIN_PASSWORD }),
]);

// Every mode shares the email field, so switching keeps what was typed there.
function setMode(next: Mode) {
  mode.value = next;
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

// The reply is the same whether or not the address has an account (sendPasswordReset swallows
// "no such user" and "disabled"), and the screen stays here: the link in the email is the next step.
async function sendReset() {
  busy.value = true;
  try {
    await sendPasswordReset(email.value);
    session.showSnack(t('toast.success.reset-sent'));
    setMode('signIn');
  } catch (err) {
    session.showSnack(authErrorMessage(err, t));
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
  if (mode.value === 'reset') {
    void sendReset();
  } else if (mode.value === 'signIn') {
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
/* The mode links wait while a request is in flight, so its answer lands in the mode that sent it. */
.login__link:disabled {
  cursor: default;
  opacity: 0.5;
}
</style>
