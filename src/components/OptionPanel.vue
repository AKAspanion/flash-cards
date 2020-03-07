<template>
    <v-card
        v-ripple
        :dark="dark"
        id="optionspanel"
        class="options-card"
        :color="dark ? '#212121' : '#e0e0e0'"
    >
        <div
            class="d-flex justify-center"
            @touchstart="handleMouseDown"
            @touchmove="handleMouseMove"
            @touchend="handleMouseUp"
            @click="handleClick"
        >
            <v-icon :disabled="loading">
                mdi-drag-horizontal
            </v-icon>
        </div>
        <slot name="title">
            <div
                v-if="title && typeof title === 'string'"
                class="options-content title px-5 pt-4 text-uppercase"
            >
                {{ title }}
            </div>
        </slot>
        <div class="options-content pt-6 pb-12 px-5 mb-2">
            <slot></slot>
        </div>
    </v-card>
</template>

<script>
export default {
    props: ['value', 'title'],
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
            return this.appLoading || this.authLoading;
        },
        authLoading() {
            return this.$store.getters.authLoading;
        },
        appLoading() {
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
                const card = document.querySelector('.options-card');
                const cardValues = card.getBoundingClientRect();
                this.touchDistance =
                    this.touchStartEvent.touches[0].clientY -
                    e.touches[0].clientY;
                const velocity =
                    Math.abs(this.touchDistance) /
                    (e.timeStamp - this.touchStartEvent.timeStamp);
                const yDistance = cardValues.height - this.touchDistance - 56;
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
                        velocity > 0.5
                            ? true
                            : this.touchDistance >= cardValues.height / 2 - 64;
                } else {
                    this.snap =
                        velocity > 0.5
                            ? false
                            : -this.touchDistance + 32 <= cardValues.height / 2;
                }
            }
        },
        handleMouseUp(e) {
            this.start = false;
            this.end = true;
            const card = document.querySelector('.options-card');
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
            const panel = document.getElementById('optionspanel');
            let target = event.target;
            do {
                if (
                    target === panel ||
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
            const card = document.querySelector('.options-card');
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
    beforeDestroy() {
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
