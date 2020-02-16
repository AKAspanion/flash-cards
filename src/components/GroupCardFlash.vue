<template>
    <div class="group-card-slider">
        <section :key="card.id + index" v-for="(card, index) in value">
            <card-flash
                :number="index + 1"
                :browse="browse"
                :color="color"
                :value="card"
                :labels="labels"
                @input="onUpdate"
                @delete="onDelete"
            ></card-flash>
        </section>
        <section>
            <div class="dummy-section"></div>
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
.group-card-slider {
    display: flex;
    overflow-x: scroll;
    scroll-behavior: smooth;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
}
section {
    width: 82.5vw;
    position: relative;
    height: calc(100vh - 160px);
    scroll-snap-align: none center;
}
.dummy-section {
    width: 32px !important;
    height: calc(100vh - 160px);
}
section:first-child {
    margin-left: 32px;
}
.group-card-slider::-webkit-scrollbar {
    width: 0 !important;
}
.group-card-slider {
    overflow: -moz-scrollbars-none;
}
.group-card-slider {
    -ms-overflow-style: none;
}
</style>
