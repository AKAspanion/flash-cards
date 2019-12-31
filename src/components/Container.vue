<template>
    <v-card flat tile width="100vw" height="calc(100vh - 56px)">
        <div class="floating-loader">
            <v-progress-linear
                v-if="loading"
                color="primary"
                indeterminate
                height="4"
            ></v-progress-linear>
        </div>
        <transition name="slide-left" mode="out-in">
            <router-view :key="$route.fullPath"></router-view>
        </transition>
    </v-card>
</template>

<script>
export default {
    name: 'Container',
    computed: {
        loading: {
            get() {
                return this.$store.getters.loading;
            },
        },
    },
};
</script>

<style>
.floating-loader {
    position: fixed;
    width: 100vw;
    z-index: 100;
}
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
    transition-duration: 0.2s;
    transition-property: height, opacity, transform;
    transition-timing-function: cubic-bezier(0.55, 0, 0.1, 1);
    overflow: hidden;
}
.slide-left-enter,
.slide-right-leave-active {
    opacity: 0;
    transform: translate(2em, 0);
}
.slide-left-leave-active,
.slide-right-enter {
    opacity: 0;
    transform: translate(-2em, 0);
}
</style>
