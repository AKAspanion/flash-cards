<template>
    <v-app>
        <container />
        <nav-bar />
    </v-app>
</template>

<script lang="ts">
import Vue from 'vue';
import NavBar from '@/components/NavBar.vue';
import Container from '@/components/Container.vue';
export default Vue.extend({
    name: 'App',
    components: {
        NavBar,
        Container,
    },
});
</script>
<style>
@import "./assets/style.css";
</style>
