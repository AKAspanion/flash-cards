<template>
  <v-dialog
    :model-value="modelValue"
    max-width="400"
    :persistent="deleting"
    @update:model-value="onUpdate"
  >
    <v-card class="pa-2">
      <v-card-title>{{ t('account.delete.title') }}</v-card-title>
      <v-card-text>
        <p>{{ t('account.delete.body') }}</p>
        <p
          v-if="confirmed"
          class="mt-4 font-weight-medium"
        >
          {{ t('account.delete.confirmed') }}
        </p>
        <v-text-field
          v-else-if="method === 'password'"
          v-model="password"
          autocomplete="current-password"
          class="mt-4"
          density="comfortable"
          :disabled="deleting"
          hide-details
          :label="t('account.delete.password')"
          type="password"
          variant="outlined"
          @keyup.enter="onDelete"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          :disabled="deleting"
          variant="text"
          @click="close"
        >
          {{ t('common.cancel') }}
        </v-btn>
        <v-btn
          v-if="method === 'google' && !confirmed"
          color="error"
          :loading="googleBusy"
          variant="flat"
          @click="onGoogle"
        >
          {{ t('account.delete.google') }}
        </v-btn>
        <v-btn
          v-else
          color="error"
          :disabled="method === 'password' && !confirmed && !password"
          :loading="deleting"
          variant="flat"
          @click="onDelete"
        >
          {{ t('account.delete.confirm') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { confirmMethod } from '@/services/firebase';
import { useAccountStore } from '@/stores/account';

const props = defineProps<{
  modelValue: boolean;
  /** Back from Google's reconfirmation: skip straight to the final "Delete my account" tap. */
  confirmed?: boolean;
}>();
const emit = defineEmits<{ 'update:modelValue': [open: boolean] }>();

const { t } = useI18n();
const account = useAccountStore();

const method = confirmMethod();
const password = ref('');
// Locked (persistent, Cancel off) only while the deletion itself runs. The Google step leaves the
// page, so it only spins its own button, and a cancelled trip must leave the dialog usable.
const deleting = ref(false);
const googleBusy = ref(false);

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      password.value = '';
    }
  },
);

function close() {
  if (!deleting.value) {
    emit('update:modelValue', false);
  }
}

function onUpdate(open: boolean) {
  if (!open) {
    close();
  }
}

async function onGoogle() {
  if (googleBusy.value) {
    return;
  }
  googleBusy.value = true;
  try {
    await account.confirmWithGoogle();
  } finally {
    googleBusy.value = false;
  }
}

// Back from Google's page can restore this page from the browser cache mid-request.
function resetBusy(event: PageTransitionEvent) {
  if (event.persisted) {
    deleting.value = false;
    googleBusy.value = false;
  }
}
onMounted(() => window.addEventListener('pageshow', resetBusy));
onBeforeUnmount(() => window.removeEventListener('pageshow', resetBusy));

async function onDelete() {
  if (deleting.value) {
    return;
  }
  deleting.value = true;
  try {
    // A password user proves it's them first; a Google user already did, on the way back.
    // Offline, the store refuses each step with the offline-save message and deletes nothing.
    if (!props.confirmed && method === 'password' && !(await account.confirmWithPassword(password.value))) {
      return;
    }
    // Success clears the device's cache and loads /login as a new page.
    await account.deleteAccount();
  } finally {
    deleting.value = false;
  }
}
</script>
