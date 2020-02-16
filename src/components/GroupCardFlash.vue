<template>
    <div class="group-card-slider">
        <section
            :key="card.id + index"
            v-for="(card, index) in value"
            :style="`width: ${mobile ? '82.5' : '70.5'}vw;`"
        >
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
        <!-- TODO review -->
        <!-- <v-btn
            icon
            large
            color="primary"
            @click="slideCard('right')"
            class="group-card-btn group-card-btn--right"
        >
            <v-icon>mdi-chevron-right</v-icon>
        </v-btn>
        <v-btn
            icon
            large
            color="primary"
            @click="slideCard('left')"
            class="group-card-btn group-card-btn--left"
        >
            <v-icon>mdi-chevron-left</v-icon>
        </v-btn> -->
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
    computed: {
        mobile() {
            return this.$vuetify.breakpoint.xsOnly;
        },
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
        slideCard(type) {
            let container = document.querySelector('.group-card-slider');
            switch (type) {
                case 'left':
                    container.scrollLeft -= 500;
                    break;
                case 'right':
                    container.scrollLeft += 500;
                    break;

                default:
                    break;
            }
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
.group-card-btn {
    position: absolute;
    bottom: 38px;
}
.group-card-btn--right {
    left: calc(50% + 99px);
}
.group-card-btn--left {
    left: calc(50% - 144px);
}
</style>
