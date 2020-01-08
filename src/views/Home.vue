<template>
    <div class="home-container">
        <bar-top @click:left="goToProfile" @click:right="openSettings">
            <template #left-button>
                <v-avatar v-if="user.photoURL" size="24">
                    <v-img :src="user.photoURL"></v-img>
                </v-avatar>
                <v-icon v-else size="32" color="primary">mdi-face </v-icon>
            </template>
            <template #left-text>
                {{ user.displayName || 'na' }}
            </template>
            <template #right-button>
                <v-icon size="32" color="primary">mdi-settings</v-icon>
            </template>
            <template #right-text>
                settings
            </template>
        </bar-top>
        <div class="flash-card-set-container">
            <template v-if="pageLoading">
                <shimmer-card-flash-set
                    v-for="i in 3"
                    class="mb-6"
                    :key="i"
                ></shimmer-card-flash-set>
            </template>
            <template v-else>
                <container-empty
                    icon="mdi-card-text"
                    v-if="!flashCardSets.length"
                    title="Welcome to your flashcards library!"
                    subtitle="Add flashcard sets and it will appear here."
                >
                    <v-btn rounded color="primary" @click="goToAdd">
                        Add flashcard set
                    </v-btn>
                </container-empty>
                <div
                    class="pb-6 px-8"
                    v-for="card in flashCardSets"
                    :key="card.id"
                >
                    <card-flash-set :card="card"></card-flash-set>
                </div>
            </template>
        </div>
        <option-panel ref="settingspanel">
            <v-list-item dense class="px-0">
                <v-list-item-content>
                    <v-list-item-title>Language</v-list-item-title>
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
                            >{{ lang }}</v-btn
                        >
                    </v-btn-toggle>
                </v-list-item-action>
            </v-list-item>
            <v-list-item dense class="px-0">
                <v-list-item-content>
                    <v-list-item-title>Theme</v-list-item-title>
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
                            <v-icon x-small>mdi-white-balance-sunny</v-icon>
                        </v-btn>
                        <v-btn x-small text :value="true">
                            <v-icon x-small style="transform: rotate(-45deg)"
                                >mdi-moon-waning-crescent</v-icon
                            >
                        </v-btn>
                    </v-btn-toggle>
                </v-list-item-action>
            </v-list-item>
            <v-list-item dense class="px-0">
                <v-list-item-content>
                    <v-list-item-title>Labels</v-list-item-title>
                </v-list-item-content>
                <v-list-item-action>
                    <v-btn
                        icon
                        small
                        color="primary"
                        @click="goToFromMenu('/profile')"
                    >
                        <v-icon>
                            mdi-label-variant
                        </v-icon>
                    </v-btn>
                </v-list-item-action>
            </v-list-item>
            <v-list-item dense class="px-0">
                <v-list-item-content>
                    <v-list-item-title>Bin</v-list-item-title>
                </v-list-item-content>
                <v-list-item-action>
                    <v-btn
                        icon
                        small
                        color="primary"
                        @click="goToFromMenu('/bin')"
                    >
                        <v-icon>
                            mdi-trash-can
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
            langs: ['en', 'hi'],
            pageLoading: false,
        };
    },
    computed: {
        user() {
            return this.$store.getters.user;
        },
        flashCardSets() {
            return this.$store.getters.flashCardSets.filter((c) => !c.trashed);
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
                .catch(() => {
                    this.$store.dispatch('SET_FLASH_CARDS', []);
                    this.$store.dispatch('SET_LABELS', []);
                    this.$store.dispatch('LANDING_VISITED', false);
                })
                .finally(() => {
                    this.pageLoading = false;
                    this.$store.dispatch('LOADING', false);
                });
        }
        this.langModel = localStorage.getItem('lang') == 'hi' ? 'hi' : 'en';
        this.theme = localStorage.getItem('dark') == 'true' ? true : false;
    },
};
</script>
<style>
.home-container {
    min-height: 100vh;
}
.flash-card-set-container {
    height: calc(100vh - 136px);
    padding-bottom: 64px;
    overflow-y: auto;
}
</style>
