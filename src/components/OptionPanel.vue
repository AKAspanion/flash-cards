<template>
    <v-card dark v-ripple class="options-card">
        <div class="d-flex justify-center">
            <v-icon
                @touchend="handleMouseUp"
                @touchstart="handleMouseDown"
                @touchmove="handleMouseMove"
            >
                mdi-drag-horizontal
            </v-icon>
        </div>
        <div class="pt-4 pb-12 px-8">
            <slot>options</slot>
        </div>
    </v-card>
</template>

<script>
export default {
    data() {
        return {
            start: false,
            moving: false,
            end: false,
            open: false,
        };
    },
    methods: {
        handleMouseDown(e) {
            this.start = true;
            this.end = false;
            console.log({ mousedown: e });
        },
        handleMouseMove(e) {
            this.moving = true;
            if (this.start && !this.end) {
                let card = document.querySelector('.options-card');
                let cardValues = card.getBoundingClientRect();
                console.log(cardValues, e);
                // card.style.transform = `translate3d(0px, 100px, 0)`;
            }
            // console.log({ mousemove: e });
        },
        handleMouseUp(e) {
            this.start = false;
            this.end = true;
            if (!this.moving) {
                this.open = !this.open;
                let card = document.querySelector('.options-card');
                if (!this.open) {
                    card.style.transform = `translate3d(0px, calc(100% - 48px), 0)`;
                } else {
                    card.style.transform = `translate3d(0px, 0, 0)`;
                }
            }

            this.moving = false;
            console.log({ mouseup: e });
        },
    },
};
</script>

<style scoped>
.options-card {
    position: fixed;
    left: 0px;
    bottom: -24px;
    z-index: 110;
    width: 100%;
    will-change: transform;
    transform: translate3d(0px, calc(100% - 48px), 0);
    transition: transform 250ms cubic-bezier(1, 0, 0, 1);
}
</style>
