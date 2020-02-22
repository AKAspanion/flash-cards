<template>
    <div class="add-container">
        <bar-top @click:left="goBack" @click:right="openOptions">
            <template #left-button>
                <v-icon size="32" color="primary">mdi-arrow-left</v-icon>
            </template>
            <template #left-text>
                {{ $t('common.home') }}
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
                    class="d-flex justify-center text-center text-uppercase title pa-4 mb-4"
                >
                    <v-scale-transition origin="center center">
                        <v-icon class="mr-1" color="yellow" v-if="cardSet.fav">
                            mdi-star
                        </v-icon>
                    </v-scale-transition>
                    <div>
                        {{ cardSet.title || $t('add.set.notitle') }}
                    </div>
                </div>
            </template>
            <template #right-button>
                <v-icon size="32" color="primary">mdi-dots-vertical</v-icon>
            </template>
            <template #right-text>
                {{ $t('common.options') }}
            </template>
        </bar-top>
        <template v-if="!cardSet.cards.length">
            <container-empty
                icon="mdi-card-plus"
                :title="$t('empty.add.title')"
                :subtitle="$t('empty.add.subtitle')"
                style="height: calc(100vh - 246px)"
            >
            </container-empty>
        </template>
        <group-card-flash
            :labels="setLabels"
            :color="cardSet.color"
            v-model="cardSet.cards"
        ></group-card-flash>
        <btn-action color="primary" @click="onCardAdd" :disabled="loading">
            {{ $t('add.card') }}
        </btn-action>
        <v-btn
            fixed
            fab
            left
            bottom
            color="primary"
            @click="onSubmit"
            :class="loading ? 'elevation-0' : ''"
            :disabled="!cardSet.cards.length || loading"
        >
            <v-icon>mdi-check</v-icon>
        </v-btn>
        <option-panel ref="addoptions">
            <v-list-item class="px-0" v-if="isEdit">
                <v-list-item-content>
                    {{ $t('add.mark-as-fav') }}
                </v-list-item-content>
                <v-list-item-action>
                    <v-btn
                        icon
                        small
                        :color="cardSet.color"
                        @click.stop="cardSet.fav = !cardSet.fav"
                    >
                        <v-icon>mdi-star</v-icon>
                    </v-btn>
                </v-list-item-action>
            </v-list-item>
            <v-list-item class="px-0" v-if="isEdit">
                <v-list-item-content>
                    {{ $t('add.move-to-bin') }}
                </v-list-item-content>
                <v-list-item-action>
                    <v-btn
                        icon
                        small
                        :color="cardSet.color"
                        @click.stop="onDeleteClick"
                    >
                        <v-icon>mdi-trash-can</v-icon>
                    </v-btn>
                </v-list-item-action>
            </v-list-item>
            <v-list-item class="px-0">
                <v-list-item-content>
                    {{ $t('common.color') }}
                </v-list-item-content>
                <v-list-item-action>
                    <color-palette v-model="cardSet.color"></color-palette>
                </v-list-item-action>
            </v-list-item>
            <v-list-item class="px-0">
                <v-list-item-content>
                    {{ $t('common.label') }}
                </v-list-item-content>
                <div
                    class="d-flex justify-end"
                    style="width: calc(100% - 64px)"
                >
                    <template v-if="labels && labels.length">
                        <v-chip-group multiple v-model="cardSet.labels">
                            <v-chip
                                small
                                filter
                                outlined
                                :key="label.docId"
                                :value="label.docId"
                                :color="cardSet.color"
                                v-for="label in labels"
                            >
                                {{ label.label }}
                            </v-chip>
                        </v-chip-group>
                    </template>
                    <template v-else>
                        <span class="px-3">-</span>
                    </template>
                </div>
            </v-list-item>
        </option-panel>
    </div>
</template>

<script>
import { uid, loadData, navigateToPath } from '@/util';
import BarTop from '@/components/BarTop.vue';
import BtnAction from '@/components/BtnAction.vue';
import OptionPanel from '@/components/OptionPanel.vue';
import GroupCardFlash from '@/components/GroupCardFlash.vue';
import ContainerEmpty from '@/components/ContainerEmpty.vue';
import ColorPalette from '@/components/ColorPalette.vue';

import FirebaseWeb from '@/firebase';
const firebase = new FirebaseWeb();

export default {
    name: 'add',
    components: {
        BarTop,
        BtnAction,
        OptionPanel,
        ColorPalette,
        ContainerEmpty,
        GroupCardFlash,
    },
    data() {
        return {
            changed: 0,
            isEdit: false,
            titleEdit: false,
            cardSet: {
                id: uid(),
                cards: [],
                labels: [],
                color: '#E91E63',
                trashed: false,
                fav: false,
            },
        };
    },
    watch: {
        color(val) {
            this.cardSet.color = val;
        },
        cardSet: {
            handler() {
                this.changed++;
            },
            deep: true,
        },
    },
    computed: {
        loading() {
            return this.$store.getters.loading;
        },
        user() {
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
    },
    methods: {
        goBack() {
            if (this.changed > 1) {
                this.onSubmit();
            } else {
                navigateToPath('/home');
            }
        },
        onDeleteClick() {
            this.cardSet.trashed = true;
            this.openOptions();
            this.onSubmit();
        },
        openOptions() {
            this.$refs.addoptions.togglePanel();
        },
        onCardAdd() {
            this.cardSet.cards = [
                { id: uid(), front: '', back: '', learned: false },
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
                        title: this.cardSet.title || '',
                    })
                    .then((res) => {
                        this.$store.dispatch('ADD_FLASH_CARD_SET', {
                            docId: res.id,
                            ...this.cardSet,
                            uid: this.user.uid,
                            title: this.cardSet.title || '',
                        });
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
            loadData(this.user)
                .then((data) => {
                    this.$store.dispatch('SET_FLASH_CARDS', data[0]);
                    this.$store.dispatch('SET_LABELS', data[1]);
                    this.$store.dispatch('LANDING_VISITED', true);
                    this.setCards(params);
                })
                .catch(() => {
                    this.$store.dispatch('SET_FLASH_CARDS', []);
                    this.$store.dispatch('SET_LABELS', []);
                    this.$store.dispatch('LANDING_VISITED', false);
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
