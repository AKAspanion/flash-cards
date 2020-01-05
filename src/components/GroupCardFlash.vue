<template>
    <v-sheet class="mx-auto">
        <v-slide-group v-model="model">
            <v-slide-item
                :key="card.id + index"
                v-for="(card, index) in value"
                v-slot:default="{ active, toggle }"
            >
                <card-flash
                    :color="color"
                    :value="card"
                    :labels="labels"
                    @input="onUpdate"
                    @delete="onDelete"
                ></card-flash>
            </v-slide-item>
        </v-slide-group>
    </v-sheet>
</template>

<script>
import CardFlash from '@/components/CardFlash.vue';
export default {
    props: ['value', 'color', 'labels'],
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
            newData[newData.findIndex((obj) => obj.id === val.id)] = {
                ...val,
            };
            this.$emit('input', newData);
        },
        onDelete(val) {
            let newData = this.value.filter((obj) => obj.id !== val.id);
            this.$emit('input', newData);
        },
    },
};
</script>

<style></style>
