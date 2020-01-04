<template>
    <v-sheet class="mx-auto">
        <v-slide-group v-model="model" center-active>
            <v-slide-item
                :key="index"
                v-for="(card, index) in cards"
                v-slot:default="{ active, toggle }"
            >
                <transition name="slide-left" mode="out-in">
                    <card-flash :detail="card" @click="toggle"></card-flash>
                </transition>
            </v-slide-item>
        </v-slide-group>
    </v-sheet>
</template>

<script>
import CardFlash from '@/components/CardFlash.vue';
export default {
    props: {
        cards: {
            type: Array,
            required: true,
        },
    },
    components: {
        CardFlash,
    },
    data() {
        return {
            model: null,
        };
    },
};
</script>

<style></style>
