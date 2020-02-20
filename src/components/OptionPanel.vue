<template>
    <v-card
        v-ripple
        :dark="dark"
        id="optionspanel"
        class="options-card"
        :color="dark ? '#212121' : '#e0e0e0'"
    >
        <div class="d-flex justify-center">
            <v-icon
                @touchstart="handleMouseDown"
                @touchmove="handleMouseMove"
                @touchend="handleMouseUp"
                @click="handleClick"
                :disabled="loading"
            >
                mdi-drag-horizontal
            </v-icon>
        </div>
        <div class="options-content pt-4 pb-12 px-8">
            <slot></slot>
        </div>
    </v-card>
</template>

<script>
export default {
    props: ['value'],
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
    computed: {
        dark() {
            return this.$vuetify.theme.dark;
        },
        loading() {
            return this.$store.getters.loading;
        },
    },
    watch: {
        value(val) {
            this.$emit('input', val);
        },
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
                let yDistance = cardValues.height - this.touchDistance - 56;
                if (this.touchDistance <= cardValues.height - 56) {
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
                this.toggleOpen();
                if (!this.open) {
                    card.style.transform = `translate3d(0px, calc(100% - 56px), 0)`;
                } else {
                    card.style.transform = `translate3d(0px, 0, 0)`;
                }
            } else {
                if (this.snap) {
                    this.open = true;
                    card.style.transform = `translate3d(0px, 0, 0)`;
                } else {
                    this.open = false;
                    card.style.transform = `translate3d(0px, calc(100% - 56px), 0)`;
                }
            }
            this.touchEndEvent = e;
            this.touchStartEvent = null;
            this.touchDistance = 0;
            this.moving = false;
            this.snap = false;
        },
        handleClick(e) {
            this.componentclickEvent = e;
            if (!this.touchEndEvent) {
                this.togglePanel();
            }
        },
        docClickHandler(event) {
            var panel = document.getElementById('optionspanel'),
                target = event.target;
            do {
                if (
                    target == panel ||
                    (target.className &&
                        target.className.search('v-btn') !== -1)
                ) {
                    return;
                }
                target = target.parentNode;
            } while (target);
            if (this.open) {
                this.togglePanel();
            }
        },
        toggleOpen() {
            this.open = !this.open;
        },
        togglePanel() {
            this.toggleOpen();
            let card = document.querySelector('.options-card');
            if (this.open) {
                card.style.transform = `translate3d(0px, 0, 0)`;
            } else {
                card.style.transform = `translate3d(0px, calc(100% - 56px), 0)`;
            }
        },
    },
    created() {
        document.addEventListener('click', this.docClickHandler, false);
    },
    destroyed() {
        document.removeEventListener('click', this.docClickHandler, false);
    },
};
</script>

<style scoped>
.options-card {
    position: fixed;
    left: 12px;
    bottom: -28px;
    z-index: 110;
    width: calc(100% - 24px);
    will-change: transform;
    transition: transform 200ms ease-out;
    transform: translate3d(0px, calc(100% - 56px), 0);
}
.options-content {
    margin: 0px auto;
    max-width: 400px;
}
</style>
