<template>
  <div class="home">
    <bar-top
      :left-label="t('common.profile')"
      @click:left="router.push('/profile')"
    >
      <template #left-button>
        <v-avatar
          v-if="user?.photoURL && !imgErr"
          size="32"
        >
          <v-img
            :alt="t('common.profile')"
            :src="user.photoURL"
            @error="imgErr = true"
          />
        </v-avatar>
        <v-icon
          v-else
          color="primary"
          size="32"
        >
          mdi-account-circle
        </v-icon>
      </template>
      <template #left-text>
        {{ firstName }}
      </template>
      <template #right>
        <v-menu
          :close-on-content-click="false"
          location="bottom end"
          @after-enter="searchBox?.focus()"
        >
          <template #activator="{ props: activator }">
            <v-btn
              v-bind="activator"
              :aria-label="t('common.search')"
              :disabled="!library.sets.length"
              height="64"
              icon
              variant="text"
              width="64"
            >
              <v-icon
                color="primary"
                size="32"
              >
                mdi-magnify
              </v-icon>
            </v-btn>
            <div class="text-label-medium text-uppercase">
              {{ t('common.search') }}
            </div>
          </template>
          <v-card
            class="pa-2"
            width="280"
          >
            <v-text-field
              ref="searchBox"
              v-model="search"
              :aria-label="t('common.search')"
              density="compact"
              hide-details
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
            />
          </v-card>
        </v-menu>
      </template>
      <div class="mx-4">
        <v-chip
          v-if="search.trim()"
          class="mr-3"
          closable
          size="small"
          variant="outlined"
          @click:close="search = ''"
        >
          <v-icon
            size="small"
            start
          >
            mdi-magnify
          </v-icon>
          {{ search.trim().toLowerCase() }}
        </v-chip>
        <v-chip
          v-if="filterLabel"
          class="mr-3"
          closable
          size="small"
          variant="outlined"
          @click:close="filterLabel = null"
        >
          <v-icon
            size="small"
            start
          >
            mdi-label-variant
          </v-icon>
          {{ filterLabel.label }}
        </v-chip>
        <v-chip
          v-if="favOnly"
          class="mr-3"
          closable
          size="small"
          variant="outlined"
          @click:close="favOnly = false"
        >
          <v-icon
            size="small"
            start
          >
            mdi-star
          </v-icon>
          {{ t('common.favourite') }}
        </v-chip>
      </div>
    </bar-top>

    <div class="home__sets">
      <div
        v-if="library.status === 'loading' || library.status === 'idle'"
        class="set-grid"
      >
        <shimmer-card-flash-set
          v-for="i in shimmerCount"
          :key="i"
        />
      </div>
      <container-empty
        v-else-if="library.status === 'error'"
        icon="mdi-alert-circle-outline"
        :subtitle="t('empty.error.subtitle')"
        :title="t('empty.error.title')"
      >
        <v-btn
          color="primary"
          rounded="xl"
          @click="library.load(true)"
        >
          {{ t('common.retry') }}
        </v-btn>
      </container-empty>
      <container-empty
        v-else-if="!visibleSets.length"
        :icon="filtering ? 'mdi-card-bulleted-off-outline' : 'mdi-card-bulleted-outline'"
        :subtitle="filtering ? t('empty.filter.subtitle') : t('empty.home.subtitle')"
        :title="filtering ? t('empty.filter.title') : t('empty.home.title')"
      >
        <v-btn
          v-if="!filtering"
          color="primary"
          rounded="xl"
          @click="router.push('/add')"
        >
          {{ t('home.set.add') }}
        </v-btn>
      </container-empty>
      <transition-group
        v-else
        class="set-grid"
        name="set-list"
        tag="div"
      >
        <card-flash-set
          v-for="set in visibleSets"
          :key="set.id"
          :card="set"
          :disabled="session.loading"
          @delete="moveToBin"
          @fav="toggleFav"
          @label="(label) => (filterLabel = label)"
          @star="favOnly = true"
        />
      </transition-group>
      <ad-banner v-if="library.status !== 'idle' && library.status !== 'loading'" />
    </div>

    <option-panel
      ref="menuPanel"
      :title="t('common.menu')"
    >
      <button
        v-for="item in menuItems"
        :key="item.path"
        v-ripple
        class="option-row option-row--action"
        type="button"
        @click.stop="goFromMenu(item.path)"
      >
        <span class="option-row__label">{{ item.title }}</span>
        <v-icon color="primary">
          {{ item.icon }}
        </v-icon>
      </button>
    </option-panel>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useDisplay } from 'vuetify';
import AdBanner from '@/components/AdBanner.vue';
import BarTop from '@/components/BarTop.vue';
import CardFlashSet from '@/components/CardFlashSet.vue';
import ContainerEmpty from '@/components/ContainerEmpty.vue';
import OptionPanel from '@/components/OptionPanel.vue';
import ShimmerCardFlashSet from '@/components/ShimmerCardFlashSet.vue';
import type { CardSet, Label } from '@/types';
import { filterAndSortSets } from '@/utils/cardSets';
import { useLibraryStore } from '@/stores/library';
import { usePrefsStore } from '@/stores/prefs';
import { useSessionStore } from '@/stores/session';

const { t } = useI18n();
const router = useRouter();
const display = useDisplay();
const session = useSessionStore();
const library = useLibraryStore();
const prefs = usePrefsStore();

const search = ref('');
const filterLabel = ref<Label | null>(null);
const favOnly = ref(false);
const imgErr = ref(false);
const searchBox = ref<{ focus: () => void } | null>(null);
const menuPanel = ref<InstanceType<typeof OptionPanel> | null>(null);

const user = computed(() => session.user);
const firstName = computed(() => user.value?.displayName?.split(' ')[0] || user.value?.email?.split('@')[0] || '');
const filtering = computed(() => !!search.value.trim() || !!filterLabel.value || favOnly.value);
const visibleSets = computed(() =>
  filterAndSortSets(library.sets, {
    search: search.value,
    labelId: filterLabel.value?.docId,
    favOnly: favOnly.value,
    order: prefs.setOrder,
    favOnTop: prefs.favOnTop,
  }),
);
const shimmerCount = computed(() => ({ xs: 3, sm: 4, md: 4, lg: 6, xl: 9, xxl: 9 })[display.name.value] ?? 3);

const menuItems = computed(() => [
  { title: t('common.bin'), icon: 'mdi-trash-can', path: '/bin' },
  { title: t('common.labels'), icon: 'mdi-label-variant', path: '/profile' },
  { title: t('common.about'), icon: 'mdi-information', path: '/info' },
  { title: t('common.settings'), icon: 'mdi-cog', path: '/settings' },
]);

function goFromMenu(path: string) {
  menuPanel.value?.toggle(false);
  setTimeout(() => router.push(path), 300);
}

function toggleFav(set: CardSet) {
  void library.saveSet({ ...set, fav: !set.fav });
}

async function moveToBin(set: CardSet) {
  if (await library.saveSet({ ...set, trashed: true })) {
    session.showSnack(t('toast.moved-to-bin'), {
      text: t('common.undo'),
      onAction: () => void library.saveSet({ ...set, trashed: false }),
    });
  }
}
</script>

<style scoped>
.home__sets {
  padding-bottom: 96px;
}
.set-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr));
  gap: 24px 32px;
  padding: 12px 32px;
}
.set-list-enter-active {
  transition: all 0.3s ease;
}
.set-list-enter-from {
  opacity: 0;
  transform: translateY(16px);
}
.set-list-leave-active {
  display: none;
}
</style>
