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
                <div class="d-flex align-center justify-center">
                    <v-scale-transition origin="center center">
                        <v-icon
                            class="mr-1 mb-5"
                            color="yellow"
                            v-if="cardSet.fav"
                        >
                            mdi-star
                        </v-icon>
                    </v-scale-transition>
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
                        class="d-flex justify-center text-center text-uppercase title py-4 mb-4"
                    >
                        <div>
                            {{ cardSet.title || $t('add.set.notitle') }}
                        </div>
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
            @delete="onCardDelete"
            @focused="(val) => (focusedIndex = val)"
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
        <option-panel :title="$t('common.options')" ref="addoptions">
            <v-list-item class="px-0">
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
            deletedCard: null,
            focusedIndex: 0,
            cardSet: {
                id: uid(),
                cards: [],
                labels: [],
                color: '#E91E63',
                date: new Date(),
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
        snackBtnCLicked(val) {
            if (val) {
                this.restoreCard();
            }
        },
    },
    computed: {
        loading() {
            return this.appLoading || this.authLoading;
        },
        authLoading() {
            return this.$store.getters.authLoading;
        },
        appLoading() {
            return this.$store.getters.loading;
        },
        user() {
            return this.$store.getters.user;
        },
        labels() {
            return this.$store.getters.labels;
        },
        setLabels() {
            return this.labels.filter((label) => {
                return this.cardSet.labels.includes(label.docId);
            });
        },
        snackBtnCLicked() {
            return this.$store.getters.snackBtnCLicked;
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
        onCardDelete(data) {
            this.deletedCard = data;
            this.$store.dispatch('SHOW_BTN_SNACK', {
                text: this.$t('add.card-delete'),
                btn: this.$t('common.restore'),
            });
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
            const newCard = {
                id: uid(),
                front: '',
                back: '',
                learned: false,
                date: new Date(),
            };
            const index = this.focusedIndex || 0;
            if (index) {
                this.cardSet.cards.splice(index, 0, newCard);
            } else {
                this.cardSet.cards.unshift(newCard);
            }
        },
        restoreCard() {
            if (this.deletedCard) {
                this.cardSet.cards.splice(
                    this.deletedCard.index,
                    0,
                    this.deletedCard.val
                );
                this.deletedCard = null;
            }
        },
        setCards(params) {
            if (this.isEdit) {
                const storeCardSets = this.$store.getters.flashCardSets;
                const index = storeCardSets.findIndex((e) => {
                    return e.id === params.id;
                });
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
                    })
                    .catch((err) => {
                        this.$store.dispatch('SHOW_SNACK', err.messsage);
                    })
                    .finally(() => {
                        this.$store.dispatch('LOADING', false);
                    });
            }
            navigateToPath('/home');
        },
    },
    mounted() {
        const { name, params } = this.$route;
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
