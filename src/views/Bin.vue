<template>
  <div>
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
    <div class="bin">
      <div
        v-if="library.status === 'loading' || library.status === 'idle'"
        class="set-grid"
      >
        <shimmer-card-flash-set
          v-for="i in 3"
          :key="i"
        />
      </div>
      <container-empty
        v-else-if="!trashed.length"
        icon="mdi-trash-can"
        :subtitle="t('empty.bin.subtitle')"
        :title="t('empty.bin.title')"
      />
      <transition-group
        v-else
        class="set-grid"
        name="set-list"
        tag="div"
      >
        <card-flash-set
          v-for="set in trashed"
          :key="set.id"
          bin
          :card="set"
          :disabled="busy"
          @delete="(s) => (confirmDelete = s)"
          @restore="restore"
        />
      </transition-group>
    </div>

    <v-dialog
      :model-value="!!confirmDelete"
      max-width="400"
      @update:model-value="(open: boolean) => !open && (confirmDelete = null)"
    >
      <v-card class="pa-2">
        <v-card-title>{{ t('bin.confirm.title') }}</v-card-title>
        <v-card-text>
          {{ t('bin.confirm.desc', { title: confirmDelete?.title || t('add.set.notitle') }) }}
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            @click="confirmDelete = null"
          >
            {{ t('common.cancel') }}
          </v-btn>
          <v-btn
            color="error"
            :loading="busy"
            variant="flat"
            @click="deleteForever"
          >
            {{ t('common.delete') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import BarTop from '@/components/BarTop.vue';
import CardFlashSet from '@/components/CardFlashSet.vue';
import ContainerEmpty from '@/components/ContainerEmpty.vue';
import ShimmerCardFlashSet from '@/components/ShimmerCardFlashSet.vue';
import type { CardSet } from '@/types';
import { useLibraryStore } from '@/stores/library';

const { t } = useI18n();
const router = useRouter();
const library = useLibraryStore();

const busy = ref(false);
const confirmDelete = ref<CardSet | null>(null);
const trashed = computed(() => library.sets.filter((set) => set.trashed));

async function restore(set: CardSet) {
  busy.value = true;
  await library.saveSet({ ...set, trashed: false });
  busy.value = false;
}

async function deleteForever() {
  if (!confirmDelete.value) {
    return;
  }
  busy.value = true;
  await library.deleteSet(confirmDelete.value);
  busy.value = false;
  confirmDelete.value = null;
}
</script>

<style scoped>
.bin {
  padding-bottom: 96px;
}
.set-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr));
  gap: 24px 32px;
  padding: 12px 32px;
}
.set-list-leave-active {
  display: none;
}
</style>
