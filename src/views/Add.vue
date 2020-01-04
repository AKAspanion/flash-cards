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
                <div v-if="titleEdit" class="pb-3">
                    <v-text-field
                        dense
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
        <group-card-flash :cards="cards"></group-card-flash>
        <btn-action color="primary" @click="onCardAdd">Add Card</btn-action>
        <v-btn fixed fab left bottom color="primary">
            <v-icon>mdi-check</v-icon>
        </v-btn>
    </div>
</template>

<script>
import { navigateToPath } from '@/util';
import BarTop from '@/components/BarTop.vue';
import BtnAction from '@/components/BtnAction.vue';
import GroupCardFlash from '@/components/GroupCardFlash.vue';
export default {
    name: 'add',
    data() {
        return {
            title: 'untitled set',
            cards: [{ a: 1 }, { a: 2 }],
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
            this.cards.unshift({ a: 1 });
            console.log('add card');
        },
    },
};
</script>

<style scoped>
.add-container {
    min-height: 100vh;
}
</style>
