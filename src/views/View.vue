<template>
    <div class="view-container">
        <bar-top @click:left="goBack">
            <template #left-button>
                <v-icon size="32" color="primary">mdi-arrow-left</v-icon>
            </template>
            <template #left-text>
                home
            </template>
            <template #center>
                <div class="text-center text-uppercase title pa-4 mb-4">
                    {{ cardSet.title || 'untitled set' }}
                </div>
            </template>
            <template #right-button>
                {{ `${learnedCards}/${cardSet.cards.length}` }}
            </template>
            <template #right-text>
                learned
            </template>
        </bar-top>
        <div>
            <group-card-flash
                :browse="true"
                :labels="setLabels"
                :color="cardSet.color"
                v-model="cardSet.cards"
            ></group-card-flash>
        </div>
    </div>
</template>

<script>
import { navigateToPath, loadData } from '@/util';
import BarTop from '@/components/BarTop.vue';
import BtnAction from '@/components/BtnAction.vue';
import GroupCardFlash from '@/components/GroupCardFlash.vue';

import FirebaseWeb from '@/firebase';
const firebase = new FirebaseWeb();

export default {
    components: { BarTop, BtnAction, GroupCardFlash },
    data() {
        return {
            changed: 0,
            dataLoading: false,
            cardSet: {
                color: '',
                labels: [],
                cards: [],
            },
        };
    },
    computed: {
        currentUser() {
            return this.$store.getters.user;
        },
        labels() {
            return this.$store.getters.labels;
        },
        setLabels() {
            return this.labels.filter((label) =>
                this.cardSet.labels.includes(label.docId)
            );
        },
        learnedCards() {
            return this.cardSet.cards.reduce((total, value) => {
                return (total += value.learned ? 1 : 0);
            }, 0);
        },
    },
    watch: {
        cardSet: {
            handler() {
                this.changed++;
            },
            deep: true,
        },
    },
    methods: {
        goBack() {
            if (this.changed > 1) {
                this.onSubmit();
            } else {
                navigateToPath('/home');
            }
        },
        setCards(params) {
            let storeCardSets = this.$store.getters.flashCardSets;
            let index = storeCardSets.findIndex((e) => e.id === params.id);
            if (index >= 0) {
                this.cardSet = { ...storeCardSets[index] };
            } else {
                this.goBack();
            }
        },
        onSubmit() {
            this.$store.dispatch('LOADING', true);
            firebase
                .updateFlashCardSet(this.cardSet)
                .then((res) => {
                    this.$store.dispatch('UPDATE_FLASH_CARD_SET', this.cardSet);
                    navigateToPath('/home');
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
        let { params } = this.$route;
        if (!this.$store.getters.landingVisited) {
            this.dataLoading = true;
            this.$store.dispatch('LOADING', true);
            loadData(this.currentUser)
                .then((data) => {
                    this.$store.dispatch('SET_FLASH_CARDS', data[0]);
                    this.$store.dispatch('SET_LABELS', data[1]);
                    this.$store.dispatch('LANDING_VISITED', true);
                    this.setCards(params);
                })
                .catch((err) => {
                    this.$store.dispatch('SET_FLASH_CARDS', []);
                    this.$store.dispatch('SET_LABELS', []);
                    this.$store.dispatch('LANDING_VISITED', false);
                })
                .finally(() => {
                    this.dataLoading = true;
                    this.$store.dispatch('LOADING', false);
                });
        } else {
            this.setCards(params);
        }
    },
};
</script>

<style scoped>
.view-container {
    min-height: 100vh;
}
</style>
