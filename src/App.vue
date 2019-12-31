<template>
    <v-app>
        <v-content>
            <transition name="slide-left" mode="out-in">
                <router-view :key="$route.fullPath"></router-view>
            </transition>
        </v-content>
    </v-app>
</template>

<script lang="ts">
import Vue from 'vue';
export default Vue.extend({
    name: 'App',
});
</script>
<style>
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
