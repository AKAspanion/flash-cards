<template>
    <div>
        <bar-top @click:left="goBack">
            <template #left-button>
                <v-icon size="32" color="primary">mdi-arrow-left</v-icon>
            </template>
            <template #left-text>
                {{ $t('common.home') }}
            </template>
        </bar-top>
        <v-card
            flat
            class="settings-card"
            :color="dark ? '#212121' : '#e0e0e0'"
        >
            <div class="settings-container">
                <div class="d-flex align-start pb-6">
                    <v-icon class="py-2" style="min-width:24px;">
                        mdi-translate
                    </v-icon>
                    <v-list-item class="pa-0 pl-8">
                        <v-list-item-content class="py-0">
                            <v-list-item-title>
                                {{ $t('settings.language.title') }}
                            </v-list-item-title>
                            <v-list-item-subtitle>
                                {{ $t('settings.language.desc') }}
                            </v-list-item-subtitle>
                        </v-list-item-content>
                        <v-list-item-action>
                            <v-btn-toggle
                                dark
                                rounded
                                mandatory
                                v-model="langModel"
                                background-color="primary"
                            >
                                <v-btn
                                    text
                                    x-small
                                    v-for="(lang, i) in langs"
                                    :key="`Lang${i}`"
                                    :value="lang"
                                    >{{ lang === 'hi' ? 'ही' : lang }}</v-btn
                                >
                            </v-btn-toggle>
                        </v-list-item-action>
                    </v-list-item>
                </div>
                <div class="d-flex align-start pb-6">
                    <v-icon class="py-2" style="min-width:24px;">
                        mdi-brightness-4
                    </v-icon>
                    <v-list-item class="px-0 pl-8">
                        <v-list-item-content class="py-0">
                            <v-list-item-title>
                                {{ $t('settings.theme.title') }}
                            </v-list-item-title>
                            <v-list-item-subtitle>
                                {{ $t('settings.theme.desc') }}
                            </v-list-item-subtitle>
                        </v-list-item-content>
                        <v-list-item-action>
                            <v-btn-toggle
                                dark
                                rounded
                                mandatory
                                v-model="theme"
                                background-color="primary"
                            >
                                <v-btn x-small text :value="false">
                                    <v-icon x-small>
                                        mdi-white-balance-sunny
                                    </v-icon>
                                </v-btn>
                                <v-btn x-small text :value="true">
                                    <v-icon
                                        x-small
                                        style="transform: rotate(-45deg)"
                                    >
                                        mdi-moon-waning-crescent
                                    </v-icon>
                                </v-btn>
                            </v-btn-toggle>
                        </v-list-item-action>
                    </v-list-item>
                </div>
                <div class="d-flex align-start pb-6">
                    <v-icon class="py-2" style="min-width:24px;">
                        mdi-star
                    </v-icon>
                    <v-list-item class="px-0 pl-8">
                        <v-list-item-content class="py-0">
                            <v-list-item-title>
                                {{ $t('settings.favourite.title') }}
                            </v-list-item-title>
                            <v-list-item-subtitle>
                                {{ $t('settings.favourite.desc') }}
                            </v-list-item-subtitle>
                        </v-list-item-content>
                        <v-list-item-action>
                            <v-switch
                                v-model="favOnTop"
                                color="primary"
                                class="px-1"
                            ></v-switch>
                        </v-list-item-action>
                    </v-list-item>
                </div>
                <div class="d-flex align-start pb-6" v-if="false">
                    <v-icon class="py-2" style="min-width:24px;">
                        mdi-card-outline
                    </v-icon>
                    <div class="pl-8 full-width">
                        <v-list-item class="px-0 mb-2">
                            <v-list-item-content class="py-0">
                                <v-list-item-title>
                                    {{ $t('settings.cards.title') }}
                                </v-list-item-title>
                                <v-list-item-subtitle>
                                    {{ $t('settings.cards.desc') }}
                                </v-list-item-subtitle>
                            </v-list-item-content>
                        </v-list-item>
                        <v-select
                            dense
                            rounded
                            disabled
                            outlined
                            hide-details
                            :items="orderTypes"
                            v-model="cardsOrder"
                        ></v-select>
                    </div>
                </div>
                <div class="d-flex align-start pb-6">
                    <v-icon class="py-2" style="min-width:24px;">
                        mdi-card-text-outline
                    </v-icon>
                    <div class="pl-8 full-width">
                        <v-list-item class="px-0 mb-2">
                            <v-list-item-content class="py-0">
                                <v-list-item-title>
                                    {{ $t('settings.card-set.title') }}
                                </v-list-item-title>
                                <v-list-item-subtitle>
                                    {{ $t('settings.card-set.desc') }}
                                </v-list-item-subtitle>
                            </v-list-item-content>
                        </v-list-item>
                        <v-select
                            dense
                            rounded
                            outlined
                            hide-details
                            item-text="label"
                            item-value="val"
                            :items="orderTypes"
                            v-model="cardSetOrder"
                        ></v-select>
                    </div>
                </div>
            </div>
        </v-card>
    </div>
</template>
<script>
import { navigateToPath, loadData } from '@/util';
import BarTop from '@/components/BarTop.vue';
export default {
    name: 'Settings',
    components: {
        BarTop,
    },
    data() {
        return {
            langs: ['en', 'hi'],
        };
    },
    computed: {
        dark() {
            return this.$vuetify.theme.dark;
        },
        user() {
            return this.$store.getters.user;
        },
        orderTypes() {
            return [
                {
                    label: this.$t('settings.order-items.al'),
                    val: 'Alphabetically',
                },
                {
                    label: this.$t('settings.order-items.nf'),
                    val: 'New first',
                },
                {
                    label: this.$t('settings.order-items.of'),
                    val: 'Old first',
                },
            ];
        },
        cardsOrder: {
            get() {
                let order = localStorage.getItem('cards-order');
                return this.orderTypes.indexOf((o) => o.val === order)
                    ? order
                    : 'Alphabetically';
            },
            set(val) {
                localStorage.setItem('cards-order', val);
            },
        },
        cardSetOrder: {
            get() {
                let order = localStorage.getItem('card-set-order');
                return this.orderTypes.indexOf((o) => o.val === order)
                    ? order
                    : 'Alphabetically';
            },
            set(val) {
                localStorage.setItem('card-set-order', val);
            },
        },
        favOnTop: {
            get() {
                return localStorage.getItem('fav-on-top') == 'true';
            },
            set(val) {
                localStorage.setItem('fav-on-top', val);
            },
        },
        theme: {
            get() {
                return this.$vuetify.theme.dark;
            },
            set(val) {
                this.$vuetify.theme.dark = val;
                localStorage.setItem(
                    'dark',
                    JSON.stringify(this.$vuetify.theme.dark)
                );
            },
        },
        langModel: {
            get() {
                return this.$i18n.locale;
            },
            set(val) {
                this.$i18n.locale = val;
                localStorage.setItem('lang', this.$i18n.locale);
            },
        },
    },
    methods: {
        goBack() {
            navigateToPath('/home');
        },
    },
    mounted() {
        if (!this.$store.getters.landingVisited) {
            this.dataLoading = true;
            this.$store.dispatch('LOADING', true);
            loadData(this.user)
                .then((data) => {
                    this.$store.dispatch('SET_FLASH_CARDS', data[0]);
                    this.$store.dispatch('SET_LABELS', data[1]);
                    this.$store.dispatch('LANDING_VISITED', true);
                })
                .catch((err) => {
                    this.$store.dispatch('SET_FLASH_CARDS', []);
                    this.$store.dispatch('SET_LABELS', []);
                    this.$store.dispatch('LANDING_VISITED', false);
                })
                .finally(() => {
                    this.dataLoading = false;
                    this.$store.dispatch('LOADING', false);
                });
        }
    },
};
</script>
<style scoped>
.settings-container {
    height: calc(100vh - 137px);
    padding: 32px 32px 88px 32px;
    overflow-y: auto;
}
.settings-card {
    padding-top: 1px;
    height: calc(100vh - 136px);
    border-bottom-right-radius: 0px !important;
    border-bottom-left-radius: 0px !important;
}
</style>
