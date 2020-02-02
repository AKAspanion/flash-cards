<template>
    <div class="slider">
        <section :key="card.id + index" v-for="(card, index) in value">
            <card-flash
                :browse="browse"
                :color="color"
                :value="card"
                :labels="labels"
                @input="onUpdate"
                @delete="onDelete"
            ></card-flash>
        </section>
    </div>
</template>

<script>
import CardFlash from '@/components/CardFlash.vue';
export default {
    props: ['value', 'color', 'labels', 'browse'],
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

<style scoped>
.slider {
    display: flex;
    overflow-x: scroll;
    scroll-behavior: smooth;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
}
section {
    width: 80vw;
    position: relative;
    height: calc(100vh - 224px);
    scroll-snap-align: none center;
}
.slider::-webkit-scrollbar {
    width: 0 !important;
}
.slider {
    overflow: -moz-scrollbars-none;
}
.slider {
    -ms-overflow-style: none;
}
</style>
