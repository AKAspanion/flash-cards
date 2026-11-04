<template>
  <v-dialog
    :model-value="modelValue"
    max-width="400"
    :persistent="busy"
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
          :disabled="busy"
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
          :disabled="busy"
          variant="text"
          @click="close"
        >
          {{ t('common.cancel') }}
        </v-btn>
        <v-btn
          v-if="method === 'google' && !confirmed"
          color="error"
          :loading="busy"
          variant="flat"
          @click="onGoogle"
        >
          {{ t('account.delete.google') }}
        </v-btn>
        <v-btn
          v-else
          color="error"
          :disabled="method === 'password' && !confirmed && !password"
          :loading="busy"
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
import { ref, watch } from 'vue';
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
const busy = ref(false);

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      password.value = '';
    }
  },
);

function close() {
  if (!busy.value) {
    emit('update:modelValue', false);
  }
}

function onUpdate(open: boolean) {
  if (!open) {
    close();
  }
}

async function onGoogle() {
  busy.value = true;
  try {
    await account.confirmWithGoogle();
  } finally {
    busy.value = false;
  }
}

async function onDelete() {
  if (busy.value) {
    return;
  }
  busy.value = true;
  try {
    // A password user proves it's them first; a Google user already did, on the way back.
    if (!props.confirmed && method === 'password' && !(await account.confirmWithPassword(password.value))) {
      return;
    }
    // Success signs the user out, and the auth listener moves them to /login.
    await account.deleteAccount();
  } finally {
    busy.value = false;
  }
}
</script>
