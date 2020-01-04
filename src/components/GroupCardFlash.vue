<template>
    <v-sheet class="mx-auto">
        <v-slide-group v-model="model">
            <v-slide-item
                :key="card.id + index"
                v-for="(card, index) in value"
                v-slot:default="{ active, toggle }"
            >
                <transition name="slide-left" mode="out-in">
                    <card-flash :value="card" @input="onUpdate"></card-flash>
                </transition>
            </v-slide-item>
        </v-slide-group>
    </v-sheet>
</template>

<script>
import CardFlash from '@/components/CardFlash.vue';
export default {
    props: ['value'],
    components: {
        CardFlash,
    },
    data() {
        return {
            model: null,
        };
    },
    methods: {
        onUpdate(val) {
            let newData = [...this.value];
            newData[newData.findIndex((obj) => obj.id == val.id)] = {
                ...val,
            };
            this.$emit('input', newData);
        },
    },
};
</script>

<style></style>
