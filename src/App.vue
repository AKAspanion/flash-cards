<template>
    <v-app>
        <v-progress-linear
            class="floating-loader"
            v-if="loading"
            color="primary"
            indeterminate
            height="4"
        ></v-progress-linear>
        <v-snackbar v-model="snackbar.model" multi-line bottom :timeout="5000">
            {{ snackbar.text }}
            <v-btn dark text @click="snackbar.model = false">{{
                $t('close')
            }}</v-btn>
        </v-snackbar>
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
        snackbar() {
            return this.$store.getters.snackBar;
        },
    },
});
</script>
<style>
@import './assets/style.css';
</style>
