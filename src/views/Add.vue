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
                        v-model="cardSet.title"
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
                    {{ cardSet.title || 'untitled set' }}
                </div>
            </template>
            <template #right-button>
                <v-icon size="32" color="primary">mdi-dots-vertical</v-icon>
            </template>
            <template #right-text>
                options
            </template>
        </bar-top>
        <template v-if="!cardSet.cards.length">
            <container-empty
                icon="mdi-cards"
                title="Add a flashcard and it will appear here"
                style="height: calc(100vh - 256px)"
            ></container-empty>
        </template>
        <group-card-flash
            :value="cardSet.cards"
            @input="(e) => (cardSet.cards = e)"
        ></group-card-flash>
        <btn-action color="primary" @click="onCardAdd" :disabled="loading">
            Add Card
        </btn-action>
        <v-btn
            fixed
            fab
            left
            bottom
            color="primary"
            @click="onSubmit"
            :loading="loading"
            :disabled="!cardSet.cards.length"
        >
            <v-icon>mdi-check</v-icon>
        </v-btn>
        <option-panel ref="addoptions" v-slot:default="{ toggle }">
            option <br />
            list <br />
            coming <br />
            soon <br />
        </option-panel>
    </div>
</template>

<script>
import { navigateToPath, uid, fetchAllFlashCardSets } from '@/util';
import BarTop from '@/components/BarTop.vue';
import BtnAction from '@/components/BtnAction.vue';
import OptionPanel from '@/components/OptionPanel.vue';
import GroupCardFlash from '@/components/GroupCardFlash.vue';
import ContainerEmpty from '@/components/ContainerEmpty.vue';

import FirebaseWeb from '@/firebase';
const firebase = new FirebaseWeb();

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
            isEdit: false,
            titleEdit: false,
            cardSet: {
                id: uid(),
                cards: [],
            },
        };
    },
    computed: {
        loading() {
            return this.$store.getters.loading;
        },
        user() {
            return this.$store.getters.user;
        },
    },
    methods: {
        goBack() {
            navigateToPath('/home');
        },
        openOptions() {
            this.$refs.addoptions.togglePanel();
        },
        onCardAdd() {
            this.cardSet.cards = [
                { id: uid(), front: '', back: '' },
                ...this.cardSet.cards,
            ];
        },
        setCards(params) {
            if (this.isEdit) {
                let storeCardSets = this.$store.getters.flashCardSets;
                let index = storeCardSets.findIndex((e) => e.id === params.id);
                if (index >= 0) {
                    this.cardSet = { ...storeCardSets[index] };
                } else {
                    navigateToPath('/add');
                }
            }
        },
        onSubmit() {
            this.$store.dispatch('LOADING', true);
            if (!this.isEdit) {
                firebase
                    .addFlashCardSet(this.user, {
                        ...this.cardSet,
                        title: this.cardSet.title || 'untitled set',
                    })
                    .then((res) => {
                        this.$store.dispatch('ADD_FLASH_CARD_SET', {
                            docId: res.id,
                            ...this.cardSet,
                            uid: this.user.uid,
                            title: this.cardSet.title || 'untitled set',
                        });
                        this.$store.dispatch(
                            'SHOW_SNACK',
                            'Task added successully!'
                        );
                        navigateToPath('/home');
                    })
                    .catch((err) => {
                        this.$store.dispatch('SHOW_SNACK', err.messsage);
                    })
                    .finally(() => {
                        this.$store.dispatch('LOADING', false);
                    });
            } else {
                firebase
                    .updateFlashCardSet(this.cardSet)
                    .then((res) => {
                        this.$store.dispatch(
                            'UPDATE_FLASH_CARD_SET',
                            this.cardSet
                        );
                        this.$store.dispatch(
                            'SHOW_SNACK',
                            'Task updated successully!'
                        );
                        navigateToPath('/home');
                    })
                    .catch((err) => {
                        this.$store.dispatch('SHOW_SNACK', err.messsage);
                    })
                    .finally(() => {
                        this.$store.dispatch('LOADING', false);
                    });
            }
        },
    },
    mounted() {
        let { name, params } = this.$route;
        this.isEdit = name === 'edit';
        if (!this.$store.getters.landingVisited) {
            this.$store.dispatch('LOADING', true);
            fetchAllFlashCardSets(this.$store.getters.user)
                .then((data) => {
                    this.$store.dispatch('SET_FLASH_CARDS', data);
                    this.$store.dispatch('LANDING_VISITED', true);
                    this.setCards(params);
                })
                .catch(() => {
                    this.$store.dispatch('SET_FLASH_CARDS', []);
                })
                .finally(() => {
                    this.$store.dispatch('LOADING', false);
                });
        } else {
            this.setCards(params);
        }
    },
};
</script>

<style scoped>
.add-container {
    min-height: 100vh;
}
</style>
