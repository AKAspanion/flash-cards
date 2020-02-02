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
        <div class="flash-card-bin-container">
            <template v-if="dataLoading">
                <div class="mt-n3">
                    <shimmer-card-flash-set
                        class="my-6 mx-8"
                        v-for="i in 3"
                        :key="i"
                    ></shimmer-card-flash-set>
                </div>
            </template>
            <template v-else>
                <container-empty
                    icon="mdi-cards"
                    v-if="!cardSets.length"
                    title="Flashcards trash bin."
                    subtitle="Deleted flashcard sets will appear here. You can restore or delete them forever."
                ></container-empty>
                <div class="my-3 mx-8" v-for="card in cardSets" :key="card.id">
                    <card-flash-set
                        bin
                        :card="card"
                        :disabled="deleting"
                        @restore="onRestore"
                        @delete="onDelete"
                    ></card-flash-set>
                </div>
            </template>
        </div>
    </div>
</template>

<script>
import { navigateToPath, loadData } from '@/util';
import BarTop from '@/components/BarTop.vue';
import CardFlashSet from '@/components/CardFlashSet.vue';
import ShimmerCardFlashSet from '@/components/ShimmerCardFlashSet.vue';
import ContainerEmpty from '@/components/ContainerEmpty.vue';

import FirebaseWeb from '@/firebase';
const firebase = new FirebaseWeb();

export default {
    components: { BarTop, CardFlashSet, ContainerEmpty, ShimmerCardFlashSet },
    data() {
        return {
            dataLoading: false,
            deleting: false,
        };
    },
    computed: {
        cardSets() {
            return this.$store.getters.flashCardSets.filter((c) => c.trashed);
        },
        user() {
            return this.$store.getters.user;
        },
    },
    methods: {
        goBack() {
            navigateToPath('/home');
        },
        onDelete(e) {
            this.deleting = true;
            firebase
                .deleteFlashCardSet(e)
                .then((res) => {
                    this.$store.dispatch('DELETE_FLASH_CARD_SET', e);
                })
                .catch((err) => {
                    this.$store.dispatch('SHOW_SNACK', err.messsage);
                })
                .finally(() => {
                    this.deleting = false;
                });
        },
        onRestore(e) {
            this.deleting = true;
            firebase
                .updateFlashCardSet({
                    ...e,
                    trashed: false,
                })
                .then((res) => {
                    this.$store.dispatch('UPDATE_FLASH_CARD_SET', {
                        ...e,
                        trashed: false,
                    });
                })
                .catch((err) => {
                    this.$store.dispatch('SHOW_SNACK', err.messsage);
                })
                .finally(() => {
                    this.deleting = false;
                });
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
                    console.log(err);
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
.flash-card-bin-container {
    height: calc(100vh - 136px);
    padding-bottom: 64px;
    overflow-y: auto;
}
</style>
