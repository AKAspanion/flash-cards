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
        <v-snackbar v-model="snackbar.model" multi-line bottom :timeout="5000">
            {{ snackbar.text }}
            <v-btn dark text @click="snackbar.model = false">{{
                $t('close')
            }}</v-btn>
        </v-snackbar>
        <container-main />
        <bar-nav />
    </v-app>
</template>

<script lang="ts">
import Vue from 'vue';
import BarNav from '@/components/BarNav.vue';
import ContainerMain from '@/components/ContainerMain.vue';
export default Vue.extend({
    name: 'App',
    components: {
        BarNav,
        ContainerMain,
    },
    computed: {
        loading() {
            return this.$store.getters.loading;
        },
        snackbar() {
            return this.$store.getters.snackBar;
        },
    },
    mounted() {
        this.$i18n.locale = localStorage.getItem('lang') == 'hi' ? 'hi' : 'en';
        this.$vuetify.theme.dark =
            localStorage.getItem('dark') == 'true' ? true : false;
    },
});
</script>
<style>
@import './assets/style.css';
.floating-loader {
    position: absolute;
    width: 100vw;
    z-index: 100;
}
</style>
