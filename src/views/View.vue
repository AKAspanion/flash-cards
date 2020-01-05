<template>
    <div>
        <bar-top @click:left="goBack">
            <template #left-button>
                <v-icon size="32" color="primary">mdi-arrow-left</v-icon>
            </template>
            <template #left-text>
                home
            </template>
        </bar-top>
    </div>
</template>

<script>
import { navigateToPath, getInitials, loadData } from '@/util';
import BarTop from '@/components/BarTop.vue';
export default {
    components: { BarTop },
    methods: {
        goBack() {
            navigateToPath('/home');
        },
    },
    mounted() {
        if (!this.$store.getters.landingVisited) {
            this.labelLoading = true;
            this.$store.dispatch('LOADING', true);
            loadData(this.currentUser)
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
                    this.labelLoading = true;
                    this.$store.dispatch('LOADING', false);
                });
        }
    },
};
</script>

<style></style>
