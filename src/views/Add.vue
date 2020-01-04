<template>
    <div class="add-container">
        <bar-top @click:left="goBack" @click:right="openOptions">
            <template #left-button>
                <v-icon size="32" color="primary">mdi-arrow-left</v-icon>
            </template>
            <template #left-text>
                home
            </template>
            <template #center>
                <div v-if="titleEdit" class="pt-1 pb-5">
                    <v-text-field
                        dense
                        rounded
                        outlined
                        autofocus
                        hide-details
                        v-model="title"
                        @keyup.enter="titleEdit = false"
                    >
                        <template #append>
                            <v-icon @click="titleEdit = false">
                                mdi-check
                            </v-icon>
                        </template>
                    </v-text-field>
                </div>
                <div
                    v-else
                    @click="titleEdit = true"
                    class="text-center text-uppercase title pa-4 mb-4"
                >
                    {{ title }}
                </div>
            </template>
            <template #right-button>
                <v-icon size="32" color="primary">mdi-dots-vertical</v-icon>
            </template>
            <template #right-text>
                options
            </template>
        </bar-top>
        <template v-if="!cards.length">
            <container-empty
                icon="mdi-cards"
                title="Add a flashcard and it will appear here"
                style="height: calc(100vh - 256px)"
            ></container-empty>
        </template>
        <group-card-flash
            :value="cards"
            @input="(e) => (cards = e)"
        ></group-card-flash>
        <btn-action color="primary" @click="onCardAdd">Add Card</btn-action>
        <v-btn fixed fab left bottom color="primary">
            <v-icon>mdi-check</v-icon>
        </v-btn>
        <option-panel
            ref="addoptions"
            v-slot:default="{ toggle }"
        ></option-panel>
    </div>
</template>

<script>
import { navigateToPath, uid, fetchAllFlashCardSets } from '@/util';
import BarTop from '@/components/BarTop.vue';
import BtnAction from '@/components/BtnAction.vue';
import OptionPanel from '@/components/OptionPanel.vue';
import GroupCardFlash from '@/components/GroupCardFlash.vue';
import ContainerEmpty from '@/components/ContainerEmpty.vue';
export default {
    name: 'add',
    components: {
        BarTop,
        BtnAction,
        OptionPanel,
        ContainerEmpty,
        GroupCardFlash,
    },
    data() {
        return {
            title: 'untitled set',
            titleEdit: false,
            cards: [],
        };
    },
    methods: {
        goBack() {
            navigateToPath('/home');
        },
        openOptions() {
            this.$refs.addoptions.togglePanel();
        },
        onCardAdd() {
            this.cards = [{ id: uid(), front: '', back: '' }, ...this.cards];
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

<style scoped>
.add-container {
    min-height: 100vh;
}
</style>
