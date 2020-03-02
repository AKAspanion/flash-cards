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
                    <v-icon class="py-2">mdi-translate</v-icon>
                    <v-list-item class="pa-0 pl-8">
                        <v-list-item-content class="py-0">
                            <v-list-item-title>
                                {{ $t('common.language') }}
                            </v-list-item-title>
                            <v-list-item-subtitle>
                                {{ 'Change language' }}
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
                    <v-icon class="py-2">mdi-brightness-4</v-icon>
                    <v-list-item class="px-0 pl-8">
                        <v-list-item-content class="py-0">
                            <v-list-item-title>
                                {{ $t('common.theme') }}
                            </v-list-item-title>
                            <v-list-item-subtitle>
                                {{ 'Change theme' }}
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
                    <v-icon class="py-2">mdi-card-outline</v-icon>
                    <div class="pl-8 full-width">
                        <v-list-item class="px-0 mb-2">
                            <v-list-item-content class="py-0">
                                <v-list-item-title>
                                    {{ 'Cards' }}
                                </v-list-item-title>
                                <v-list-item-subtitle>
                                    {{ 'Select preferred order of cards' }}
                                </v-list-item-subtitle>
                            </v-list-item-content>
                        </v-list-item>
                        <v-select
                            dense
                            rounded
                            outlined
                            hide-details
                            :items="orderTypes"
                            v-model="cardsOrder"
                        ></v-select>
                    </div>
                </div>
                <div class="d-flex align-start pb-6">
                    <v-icon class="py-2">mdi-card-bulleted-outline</v-icon>
                    <div class="pl-8 full-width">
                        <v-list-item class="px-0 mb-2">
                            <v-list-item-content class="py-0">
                                <v-list-item-title>
                                    {{ 'Card sets order' }}
                                </v-list-item-title>
                                <v-list-item-subtitle>
                                    {{ 'Select preferred order of card sets' }}
                                </v-list-item-subtitle>
                            </v-list-item-content>
                        </v-list-item>
                        <v-select
                            dense
                            rounded
                            outlined
                            hide-details
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
            cardSetOrder: 'Alphabetically',
            cardsOrder: 'Alphabetically',
            orderTypes: ['Alphabetically', 'New first', 'Old first'],
        };
    },
    computed: {
        dark() {
            return this.$vuetify.theme.dark;
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
