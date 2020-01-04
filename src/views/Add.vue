<template>
    <div class="add-container">
        <bar-top @click:left="goBack">
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
                            <v-icon @click="titleEdit = false"
                                >mdi-check</v-icon
                            >
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
        <group-card-flash
            :value="cards"
            @input="(e) => (cards = e)"
        ></group-card-flash>
        <btn-action color="primary" @click="onCardAdd">Add Card</btn-action>
        <v-btn fixed fab left bottom color="primary">
            <v-icon>mdi-check</v-icon>
        </v-btn>
    </div>
</template>

<script>
import { navigateToPath, uid } from '@/util';
import BarTop from '@/components/BarTop.vue';
import BtnAction from '@/components/BtnAction.vue';
import GroupCardFlash from '@/components/GroupCardFlash.vue';
export default {
    name: 'add',
    data() {
        return {
            title: 'untitled set',
            cards: [
                {
                    front: 'what is hello in hindi',
                    back: 'namaste',
                    id: 1,
                },
                {
                    front: 'what is yes in french',
                    back: 'qui',
                    id: 2,
                },
            ],
            titleEdit: false,
        };
    },
    components: {
        BarTop,
        BtnAction,
        GroupCardFlash,
    },
    methods: {
        goBack() {
            navigateToPath('/home');
        },
        onCardAdd() {
            this.cards = [{ id: uid(), front: '', back: '' }, ...this.cards];
            console.log('add card');
        },
        onCardChange() {
            console.log(card);
        },
    },
};
</script>

<style scoped>
.add-container {
    min-height: 100vh;
}
</style>
