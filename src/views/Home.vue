<template>
    <div class="home-container">
        <bar-top @click:left="goToProfile" @click:right="openSearch">
            <template #left-button>
                <v-avatar v-if="user.photoURL" size="32">
                    <v-img
                        v-show="!imgErr"
                        @load="imgErr = false"
                        @error="imgErr = true"
                        :src="user.photoURL || 'a'"
                    ></v-img>
                    <v-icon v-show="imgErr" size="32" color="primary">
                        mdi-face
                    </v-icon>
                </v-avatar>
            </template>
            <template #left-text>
                {{ user.displayName ? user.displayName.split(' ')[0] : 'na' }}
            </template>
            <template #right-button>
                <v-menu :close-on-content-click="false" nudge-top="17">
                    <template #activator="{ on }">
                        <v-icon
                            v-on="on"
                            size="32"
                            color="primary"
                            :disabled="!flashCardSets.length"
                        >
                            mdi-magnify
                        </v-icon>
                    </template>
                    <v-card class="pa-2">
                        <v-text-field
                            dense
                            outlined
                            hide-details
                            ref="searchbox"
                            v-model="searchText"
                            prepend-inner-icon="mdi-magnify"
                        >
                        </v-text-field>
                    </v-card>
                </v-menu>
            </template>
            <template #right-text>
                {{ $t('common.search') }}
            </template>
            <div class="mx-4">
                <v-chip
                    v-bind="searchChipAttrs"
                    v-if="sanitizedSearchText"
                    @click:close="searchText = ''"
                >
                    <v-icon left small>mdi-magnify</v-icon>
                    {{ sanitizedSearchText.toLowerCase() }}
                </v-chip>
                <v-chip
                    v-if="filterLabel"
                    v-bind="searchChipAttrs"
                    @click:close="filterLabel = null"
                >
                    <v-icon left small>mdi-label-variant</v-icon>
                    {{ filterLabel.label }}
                </v-chip>
                <v-chip
                    v-if="starFilter"
                    v-bind="searchChipAttrs"
                    @click:close="starFilter = false"
                >
                    <v-icon left small>mdi-star</v-icon>
                    {{ $t('common.favourite') }}
                </v-chip>
            </div>
        </bar-top>
        <div class="flash-card-set-container">
            <template v-if="pageLoading">
                <div class="mt-n3">
                    <v-row no-gutters class="px-4 pb-5">
                        <v-col
                            md="6"
                            lg="4"
                            :key="i"
                            class="pa-0"
                            v-for="i in loaderCardLength"
                        >
                            <shimmer-card-flash-set
                                class="mt-6 mx-4"
                            ></shimmer-card-flash-set>
                        </v-col>
                    </v-row>
                </div>
            </template>
            <template v-else>
                <container-empty
                    :icon="
                        sanitizedSearchText
                            ? 'mdi-card-bulleted-off-outline'
                            : 'mdi-card-bulleted-outline'
                    "
                    v-if="!flashCardSets.length"
                    :title="
                        sanitizedSearchText
                            ? $t('empty.filter.title')
                            : $t('empty.home.title')
                    "
                    :subtitle="
                        sanitizedSearchText
                            ? $t('empty.filter.subtitle')
                            : $t('empty.home.subtitle')
                    "
                >
                    <v-btn
                        v-if="!sanitizedSearchText"
                        rounded
                        color="primary"
                        @click="goToAdd"
                    >
                        {{ $t('home.set.add') }}
                    </v-btn>
                </container-empty>
                <v-slide-y-reverse-transition
                    group
                    tag="div"
                    hide-on-leave
                    class="row px-4 no-gutters"
                >
                    <v-col
                        md="6"
                        lg="4"
                        sm="6"
                        cols="12"
                        :key="card.id"
                        class="py-3 px-4"
                        v-for="card in flashCardSets"
                    >
                        <card-flash-set
                            @fav="onFav"
                            @star="onStar"
                            @delete="onDelete"
                            @label="onLabelClick"
                            :disabled="loading"
                            :card="card"
                        ></card-flash-set>
                    </v-col>
                </v-slide-y-reverse-transition>
            </template>
        </div>
        <option-panel title="menu" ref="settingspanel">
            <v-list-item class="px-0">
                <v-list-item-content>
                    <v-list-item-title>
                        {{ $t('common.bin') }}
                    </v-list-item-title>
                </v-list-item-content>
                <v-list-item-action>
                    <v-btn
                        icon
                        small
                        color="primary"
                        @click.stop="goToFromMenu('/bin')"
                    >
                        <v-icon>
                            mdi-trash-can
                        </v-icon>
                    </v-btn>
                </v-list-item-action>
            </v-list-item>
            <v-list-item class="px-0">
                <v-list-item-content>
                    <v-list-item-title>
                        {{ $t('common.labels') }}
                    </v-list-item-title>
                </v-list-item-content>
                <v-list-item-action>
                    <v-btn
                        icon
                        small
                        color="primary"
                        @click.stop="goToFromMenu('/profile')"
                    >
                        <v-icon>
                            mdi-label-variant
                        </v-icon>
                    </v-btn>
                </v-list-item-action>
            </v-list-item>
            <v-list-item class="px-0">
                <v-list-item-content>
                    <v-list-item-title>
                        {{ $t('common.about') }}
                    </v-list-item-title>
                </v-list-item-content>
                <v-list-item-action>
                    <v-btn
                        icon
                        small
                        color="primary"
                        @click.stop="goToFromMenu('/info')"
                    >
                        <v-icon>
                            mdi-information
                        </v-icon>
                    </v-btn>
                </v-list-item-action>
            </v-list-item>
            <v-list-item class="px-0">
                <v-list-item-content>
                    <v-list-item-title>
                        {{ $t('common.settings') }}
                    </v-list-item-title>
                </v-list-item-content>
                <v-list-item-action>
                    <v-btn
                        icon
                        small
                        color="primary"
                        @click.stop="goToFromMenu('/settings')"
                    >
                        <v-icon>
                            mdi-settings
                        </v-icon>
                    </v-btn>
                </v-list-item-action>
            </v-list-item>
        </option-panel>
    </div>
</template>

<script>
import { navigateToPath, loadData } from '@/util';
import BarTop from '@/components/BarTop.vue';
import OptionPanel from '@/components/OptionPanel.vue';
import CardFlashSet from '@/components/CardFlashSet.vue';
import ContainerEmpty from '@/components/ContainerEmpty.vue';
import ShimmerCardFlashSet from '@/components/ShimmerCardFlashSet.vue';

import FirebaseWeb from '@/firebase';
const firebase = new FirebaseWeb();

export default {
    name: 'home',
    components: {
        BarTop,
        CardFlashSet,
        OptionPanel,
        ContainerEmpty,
        ShimmerCardFlashSet,
    },
    data() {
        return {
            pageLoading: false,
            filterLabel: null,
            starFilter: false,
            searchText: '',
            imgErr: false,
            searchChipAttrs: {
                small: true,
                close: true,
                outlined: true,
                class: 'mr-3',
            },
            orderTypes: ['Alphabetically', 'New first', 'Old first'],
        };
    },
    computed: {
        loading() {
            return this.appLoading || this.authLoading;
        },
        authLoading() {
            return this.$store.getters.authLoading;
        },
        appLoading() {
            return this.$store.getters.loading;
        },
        user() {
            return this.$store.getters.user;
        },
        sanitizedSearchText() {
            return this.searchText ? this.searchText.trim().toUpperCase() : '';
        },
        flashCardSets() {
            let sets = this.$store.getters.flashCardSets;
            // filters
            if (this.filterLabel) {
                sets = sets.filter((c) => {
                    let found = false;
                    for (const label of c.labels) {
                        if (this.filterLabel.docId === label) {
                            found = true;
                            break;
                        }
                    }
                    return found;
                });
            }
            if (this.starFilter) {
                sets = sets.filter((c) => !!c.fav);
            }
            sets = sets.filter((c) => {
                return (
                    !c.trashed &&
                    c.title.toUpperCase().includes(this.sanitizedSearchText)
                );
            });
            // sorts
            switch (this.cardSetOrder) {
                case 'Alphabetically':
                    sets.sort((s1, s2) => s1.title.localeCompare(s2.title));
                    break;
                case 'New first':
                    sets.sort(
                        (s1, s2) => new Date(s2.date) - new Date(s1.date)
                    );
                    break;
                case 'Old first':
                    sets.sort(
                        (s1, s2) => new Date(s1.date) - new Date(s2.date)
                    );
                    break;
                default:
                    break;
            }
            if (this.favOnTop) {
                sets.sort((s1, s2) => s2.fav - s1.fav);
            }
            return sets;
        },
        favOnTop() {
            return localStorage.getItem('fav-on-top') == 'true';
        },
        cardSetOrder() {
            let order = localStorage.getItem('card-set-order');
            return this.orderTypes.indexOf(order) !== -1
                ? order
                : 'Alphabetically';
        },
        loaderCardLength() {
            switch (this.$vuetify.breakpoint.name) {
                case 'xs':
                    return 3;
                case 'sm':
                    return 4;
                case 'md':
                    return 4;
                case 'lg':
                    return 6;
                case 'xl':
                    return 9;
                default:
                    return 3;
            }
        },
    },
    methods: {
        onStar() {
            this.starFilter = true;
        },
        onFav(val) {
            this.updateFlashCardSet({ ...val, fav: !val.fav });
        },
        onDelete(val) {
            this.updateFlashCardSet({ ...val, trashed: true });
        },
        onLabelClick(label) {
            this.filterLabel = label;
        },
        goToProfile() {
            navigateToPath('/profile');
        },
        goToAdd() {
            navigateToPath('/add');
        },
        goToFromMenu(path) {
            this.openSettings();
            setTimeout(() => {
                navigateToPath(path);
            }, 300);
        },
        openSettings() {
            this.$refs.settingspanel.togglePanel();
        },
        openSearch() {
            this.$nextTick(() => {
                setTimeout(() => {
                    if (this.$refs.searchbox) {
                        this.$refs.searchbox.focus();
                    }
                }, 250);
            });
        },
        updateFlashCardSet(cardSet) {
            this.$store.dispatch('LOADING', true);
            firebase
                .updateFlashCardSet(cardSet)
                .then((res) => {
                    this.$store.dispatch('UPDATE_FLASH_CARD_SET', cardSet);
                })
                .catch((err) => {
                    this.$store.dispatch('SHOW_SNACK', err.messsage);
                })
                .finally(() => {
                    this.$store.dispatch('LOADING', false);
                });
        },
    },
    mounted() {
        if (!this.$store.getters.landingVisited) {
            this.pageLoading = true;
            this.$store.dispatch('LOADING', true);
            loadData(this.user)
                .then((data) => {
                    this.$store.dispatch('SET_FLASH_CARDS', data[0]);
                    this.$store.dispatch('SET_LABELS', data[1]);
                    this.$store.dispatch('LANDING_VISITED', true);
                })
                .catch((err) => {
                    console.log(err);
                    this.$store.dispatch('SET_FLASH_CARDS', []);
                    this.$store.dispatch('SET_LABELS', []);
                    this.$store.dispatch('LANDING_VISITED', false);
                })
                .finally(() => {
                    this.pageLoading = false;
                    this.$store.dispatch('LOADING', false);
                });
        }
    },
};
</script>
<style>
.home-container {
    min-height: 100vh;
}
.flash-card-set-container {
    height: calc(100vh - 136px);
    padding-bottom: 82px;
    overflow-y: auto;
    overflow-x: hidden;
}
</style>
