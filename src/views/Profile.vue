<template>
  <div class="profile">
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

    <div class="px-8 pb-8">
      <div class="d-flex align-center profile__avatar">
        <v-avatar
          :aria-label="t('profile.photo.edit')"
          class="ml-n1 selectable"
          color="surface-light"
          role="button"
          size="88"
          tabindex="0"
          @click="startEdit('photo')"
          @keydown.enter="startEdit('photo')"
        >
          <v-img
            v-if="avatarUrl && !imageErr"
            :alt="t('common.profile')"
            :src="avatarUrl"
            @error="imageErr = true"
          />
          <v-icon
            v-else
            color="primary"
            size="88"
          >
            mdi-account-circle
          </v-icon>
        </v-avatar>
        <template v-if="editing === 'photo'">
          <v-text-field
            v-model="form.photoURL"
            autofocus
            class="pl-3"
            density="compact"
            hide-details
            :aria-label="t('profile.photo.edit')"
            :placeholder="t('profile.photo.placeholder')"
            rounded="xl"
            type="url"
            variant="outlined"
            @keyup.enter="saveProfile"
          >
            <template #append-inner>
              <v-icon
                :aria-label="t('common.save')"
                @click="saveProfile"
              >
                mdi-check
              </v-icon>
            </template>
          </v-text-field>
          <v-btn
            :aria-label="t('common.cancel')"
            class="ml-3"
            icon
            variant="text"
            @click="cancelEdit"
          >
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </template>
      </div>
      <div class="d-flex align-center text-title-large profile__text">
        <template v-if="editing !== 'name'">
          <button
            class="profile__name pt-3 pb-1"
            type="button"
            @click="startEdit('name')"
          >
            {{ user?.displayName || t('profile.name.empty') }}
          </button>
        </template>
        <template v-else>
          <v-text-field
            v-model="form.displayName"
            autofocus
            class="pt-2"
            density="compact"
            hide-details
            :aria-label="t('profile.name.placeholder')"
            :placeholder="t('profile.name.placeholder')"
            rounded="xl"
            variant="outlined"
            @keyup.enter="saveProfile"
          >
            <template #append-inner>
              <v-icon
                :aria-label="t('common.save')"
                @click="saveProfile"
              >
                mdi-check
              </v-icon>
            </template>
          </v-text-field>
          <v-btn
            :aria-label="t('common.cancel')"
            class="ml-3 mt-2"
            icon
            variant="text"
            @click="cancelEdit"
          >
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </template>
      </div>
      <div class="text-body-small profile__text">
        {{ user?.email }}
      </div>
    </div>

    <v-card
      class="profile__card"
      color="surface-light"
      flat
    >
      <div class="profile__card-content">
        <div
          v-for="item in timeMeta"
          :key="item.name"
          class="d-flex align-start pb-8"
        >
          <v-icon>{{ item.icon }}</v-icon>
          <div class="pl-8">
            <div class="text-body-small">
              {{ t(item.name) }}
            </div>
            <div class="text-title-small">
              {{ item.value }}
            </div>
          </div>
        </div>
        <div class="d-flex align-start pb-8">
          <v-icon>mdi-label-variant</v-icon>
          <div class="pl-8 flex-grow-1">
            <div class="text-body-small">
              {{ t('profile.label.title') }}
            </div>
            <div class="text-title-small">
              {{ t('profile.label.subtitle') }}
            </div>
            <div class="d-flex align-center py-2">
              <v-text-field
                v-model="labelText"
                density="compact"
                :disabled="labelBusy"
                hide-details
                :aria-label="t('profile.label.create')"
                :placeholder="t('profile.label.create')"
                rounded="xl"
                variant="outlined"
                @blur="labelFocused = false"
                @focus="labelFocused = true"
                @keyup.enter="saveLabel"
              />
              <v-btn
                :aria-label="selectedLabel ? t('common.save') : t('profile.label.create')"
                color="primary"
                :disabled="labelBusy || !labelText.trim()"
                icon
                variant="text"
                @click="saveLabel"
              >
                <v-icon>{{ selectedLabel ? 'mdi-check' : 'mdi-plus-circle' }}</v-icon>
              </v-btn>
            </div>
            <div>
              <v-chip
                v-for="label in library.labels"
                :key="label.docId"
                class="mr-3 mt-2"
                color="primary"
                size="small"
                :variant="selectedLabel?.docId === label.docId ? 'flat' : 'outlined'"
                @click="toggleLabel(label)"
              >
                {{ label.label }}
              </v-chip>
            </div>
          </div>
        </div>
        <button
          v-if="!(xs && labelFocused)"
          class="d-flex align-start profile__row"
          type="button"
          @click="deleteOpen = true"
        >
          <v-icon color="error">
            mdi-account-remove-outline
          </v-icon>
          <div class="pl-8">
            <div class="text-title-small">
              {{ t('account.delete.button') }}
            </div>
            <div class="text-body-small">
              {{ t('account.delete.row') }}
            </div>
          </div>
        </button>
      </div>
    </v-card>

    <dialog-delete-account
      v-model="deleteOpen"
      :confirmed="deleteConfirmed"
    />

    <btn-action
      v-if="!(xs && labelFocused)"
      color="primary"
      height="50"
      :loading="signingOut"
      @click="onSignOut"
    >
      {{ t('common.signout') }}
    </btn-action>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useDisplay } from 'vuetify';
import BarTop from '@/components/BarTop.vue';
import BtnAction from '@/components/BtnAction.vue';
import DialogDeleteAccount from '@/components/DialogDeleteAccount.vue';
import type { Label } from '@/types';
import { updateUserProfile } from '@/services/firebase';
import { authErrorMessage, isAuthCancel } from '@/services/authErrors';
import { clearPendingDelete, readPendingDelete, shouldResumeDeletion } from '@/utils/pendingDelete';
import { useAccountStore } from '@/stores/account';
import { useLibraryStore } from '@/stores/library';
import { useSessionStore } from '@/stores/session';

const { t, locale } = useI18n();
const router = useRouter();
const { xs } = useDisplay();
const session = useSessionStore();
const library = useLibraryStore();
const account = useAccountStore();

const user = computed(() => session.user);
const editing = ref<'photo' | 'name' | null>(null);
const form = ref({ displayName: '', photoURL: '' });
const imageErr = ref(false);
const signingOut = ref(false);

const deleteOpen = ref(false);
const deleteConfirmed = ref(false);

// Back from Google's reconfirmation: reopen the dialog at its last step, or show why it failed.
// The stored key goes either way, so a later visit never resumes an old deletion.
watch(
  () => session.redirectOutcomeLoaded,
  (loaded) => {
    if (!loaded) {
      return;
    }
    const pending = readPendingDelete(sessionStorage);
    clearPendingDelete(sessionStorage);
    const outcome = session.redirectOutcome;
    if (shouldResumeDeletion(pending, outcome, user.value?.uid ?? '', Date.now())) {
      deleteConfirmed.value = true;
      deleteOpen.value = true;
    } else if (pending && outcome && 'error' in outcome && !isAuthCancel(outcome.error)) {
      session.showSnack(authErrorMessage(outcome.error, t));
    }
  },
  { immediate: true },
);

const labelText = ref('');
const labelBusy = ref(false);
const labelFocused = ref(false);
const selectedLabel = ref<Label | null>(null);

const avatarUrl = computed(() => (editing.value === 'photo' ? form.value.photoURL : user.value?.photoURL) || '');

function formatDate(value: string | undefined, withTime: boolean) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return '-';
  }
  return withTime
    ? date.toLocaleString(locale.value, { dateStyle: 'medium', timeStyle: 'short' })
    : date.toLocaleDateString(locale.value, { dateStyle: 'medium' });
}

const timeMeta = computed(() => [
  { icon: 'mdi-calendar-star', name: 'profile.member', value: formatDate(user.value?.creationTime, false) },
  { icon: 'mdi-clock', name: 'profile.login', value: formatDate(user.value?.lastSignInTime, true) },
]);

function startEdit(field: 'photo' | 'name') {
  form.value = { displayName: user.value?.displayName ?? '', photoURL: user.value?.photoURL ?? '' };
  imageErr.value = false;
  editing.value = field;
}

function cancelEdit() {
  editing.value = null;
  imageErr.value = false;
}

async function saveProfile() {
  // Profile changes need the server (spec 10.5): offline, keep the field open with what was typed.
  if (!session.online) {
    session.showSnack(t('toast.offline-save'));
    return;
  }
  try {
    await session.track(updateUserProfile(form.value));
    session.patchUser({ displayName: form.value.displayName.trim(), photoURL: form.value.photoURL.trim() });
  } catch (err) {
    session.showError(err, 'toast.error.name.edit');
  } finally {
    editing.value = null;
    imageErr.value = false;
  }
}

function toggleLabel(label: Label) {
  selectedLabel.value = selectedLabel.value?.docId === label.docId ? null : label;
  labelText.value = selectedLabel.value?.label ?? '';
}

async function saveLabel() {
  const text = labelText.value.trim();
  if (!text || labelBusy.value) {
    return;
  }
  labelBusy.value = true;
  const ok = selectedLabel.value
    ? text === selectedLabel.value.label || (await library.renameLabel(selectedLabel.value, text))
    : !!(await library.createLabel(text));
  labelBusy.value = false;
  if (ok) {
    labelText.value = '';
    selectedLabel.value = null;
  }
}

// Signing out clears the device's cache (spec 10.6); the account store says why when it can't.
// On success the page is being replaced, so the button keeps spinning.
async function onSignOut() {
  if (signingOut.value) {
    return;
  }
  signingOut.value = true;
  if (!(await account.signOut())) {
    signingOut.value = false;
  }
}
</script>

<style scoped>
.profile {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
.profile__avatar {
  min-height: 88px;
}
.profile__text {
  padding-left: 2px;
}
.profile__name {
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  background: none;
  border: 0;
}
.profile__card {
  flex: 1 0 auto;
  border-bottom-right-radius: 0;
  border-bottom-left-radius: 0;
}
.profile__row {
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  background: none;
  border: 0;
}
.profile__card-content {
  padding: 32px 32px 120px;
}
</style>
