<template>
    <v-card dark v-ripple class="options-card">
        <div class="d-flex justify-center">
            <v-icon
                @touchstart="handleMouseDown"
                @touchmove="handleMouseMove"
                @touchend="handleMouseUp"
                @click="handleClick"
            >
                mdi-drag-horizontal
            </v-icon>
        </div>
        <div class="pt-4 pb-12 px-8">
            <slot
                >options<br />options<br />options<br />options<br />options<br
            /></slot>
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
            snap: false,
            touchDistance: 0,
            touchStartEvent: null,
            touchEndEvent: null,
        };
    },
    methods: {
        handleMouseDown(e) {
            this.start = true;
            this.end = false;
            this.touchDistance = 0;
            this.touchStartEvent = e;
        },
        handleMouseMove(e) {
            this.moving = true;
            if (this.start && !this.end) {
                let card = document.querySelector('.options-card');
                let cardValues = card.getBoundingClientRect();
                this.touchDistance =
                    this.touchStartEvent.touches[0].clientY -
                    e.touches[0].clientY;
                let yDistance = cardValues.height - this.touchDistance - 48;
                if (this.touchDistance <= cardValues.height - 48) {
                    card.style.transition = `none`;
                    if (!this.open && this.touchDistance >= 0) {
                        card.style.transform = `translate3d(0px, ${yDistance}px, 0px)`;
                    } else if (this.open && this.touchDistance < 0) {
                        card.style.transform = `translate3d(0px, ${-this
                            .touchDistance}px, 0px)`;
                    }
                }
                if (!this.open) {
                    this.snap =
                        this.touchDistance >= cardValues.height / 2 - 64;
                } else {
                    this.snap =
                        -this.touchDistance + 32 <= cardValues.height / 2;
                }
            }
        },
        handleMouseUp(e) {
            this.start = false;
            this.end = true;
            let card = document.querySelector('.options-card');
            card.style.transition = `transform 200ms ease-out`;
            if (!this.moving) {
                this.open = !this.open;
                if (!this.open) {
                    card.style.transform = `translate3d(0px, calc(100% - 48px), 0)`;
                } else {
                    card.style.transform = `translate3d(0px, 0, 0)`;
                }
            } else {
                if (this.snap) {
                    this.open = true;
                    card.style.transform = `translate3d(0px, 0, 0)`;
                } else {
                    this.open = false;
                    card.style.transform = `translate3d(0px, calc(100% - 48px), 0)`;
                }
            }
            this.touchEndEvent = e;
            this.touchStartEvent = null;
            this.touchDistance = 0;
            this.moving = false;
            this.snap = false;
        },

        handleClick(e) {
            if (!this.touchEndEvent) {
                this.open = !this.open;
            }
        },
    },
};
</script>

<style scoped>
.options-card {
    position: fixed;
    left: 0px;
    bottom: -20px;
    z-index: 110;
    width: 100%;
    will-change: transform;
    transition: transform 200ms ease-out;
    transform: translate3d(0px, calc(100% - 48px), 0);
}
</style>
