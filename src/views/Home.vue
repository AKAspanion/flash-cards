<template>
    <div class="home-container">
        <bar-top @click:left="goToProfile">
            <template #left-button>
                <v-avatar v-if="currentUser.photoURL" size="24">
                    <v-img :src="currentUser.photoURL"></v-img>
                </v-avatar>
                <v-icon v-else size="32" color="primary">mdi-face </v-icon>
            </template>
            <template #left-text>
                {{ currentUser.displayName || 'na' }}
            </template>
            <template #right-button>
                <v-icon size="32" color="primary">mdi-settings</v-icon>
            </template>
            <template #right-text>
                settings
            </template>
        </bar-top>
        <div class="px-8">
            <div class="pb-6" v-for="card in cardSets" :key="card.id">
                <card-flash-set :card="card"></card-flash-set>
            </div>
            <option-panel></option-panel>
        </div>
    </div>
</template>

<script>
import { navigateToPath, fetchAllFlashCardSets } from '@/util';
import BarTop from '@/components/BarTop.vue';
import CardFlashSet from '@/components/CardFlashSet.vue';
import OptionPanel from '@/components/OptionPanel.vue';
export default {
    name: 'home',
    components: { BarTop, CardFlashSet, OptionPanel },
    computed: {
        currentUser() {
            return this.$store.getters.user;
        },
        cardSets() {
            return this.$store.getters.flashCardSets;
        },
    },
    methods: {
        goToProfile() {
            navigateToPath('/profile');
        },
    },
    mounted() {
        if (!this.$store.getters.landingVisited) {
            this.$store.dispatch('LOADING', true);
            fetchAllFlashCardSets(this.$store.getters.user)
                .then((data) => {
                    this.$store.dispatch('SET_FLASH_CARDS', data);
                    this.$store.dispatch('LANDING_VISITED', true);
                })
                .catch(() => {
                    this.$store.dispatch('SET_FLASH_CARDS', []);
                })
                .finally(() => {
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
</style>
