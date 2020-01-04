<template>
    <v-app>
        <div class="floating-loader">
            <v-progress-linear
                v-if="loading"
                color="primary"
                indeterminate
                height="4"
            ></v-progress-linear>
        </div>
        <container />
        <bar-nav />
    </v-app>
</template>

<script lang="ts">
import Vue from 'vue';
import BarNav from '@/components/BarNav.vue';
import Container from '@/components/Container.vue';
export default Vue.extend({
    name: 'App',
    components: {
        BarNav,
        Container,
    },
    computed: {
        loading() {
            return this.$store.getters.loading;
        },
    },
});
</script>
<style>
@import './assets/style.css';
</style>
