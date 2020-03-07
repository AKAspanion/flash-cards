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
        <v-snackbar top :value="!online" color="primary" :timeout="0">
            <v-icon>mdi-wifi-off</v-icon>
        </v-snackbar>
        <v-snackbar v-model="snackbar.model" multi-line bottom :timeout="3000">
            {{ snackbar.text }}
            <v-btn dark text @click="resetSnackBar">
                {{ snackbar.btn || $t('common.close') }}
            </v-btn>
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
    data() {
        return {
            snackbarTimer: 0,
        };
    },
    computed: {
        online(): boolean {
            return this.$store.getters.isOnline;
        },
        loading(): boolean {
            return this.$store.getters.loading;
        },
        snackbar(): any {
            return this.$store.getters.snackBar;
        },
    },
    methods: {
        resetSnackBar(): void {
            clearTimeout(this.snackbarTimer);
            this.$store.dispatch('SNACK_BTN_CLICK', true);
            this.snackbarTimer = setTimeout(() => {
                this.$store.dispatch('SNACK_BTN_CLICK', false);
            }, 100);
            this.snackbar.model = false;
            this.snackbar.text = '';
            this.snackbar.btn = '';
        },
        handleConnection(e: any): void {
            let that = this;
            if (navigator.onLine) {
                this.isReachable(window.location.origin).then(function(online) {
                    if (online) {
                        that.$store.dispatch('ONLINE', true);
                    } else {
                        that.$store.dispatch('ONLINE', false);
                    }
                });
            } else {
                that.$store.dispatch('ONLINE', false);
            }
        },
        isReachable(url: any) {
            return fetch(url, { method: 'HEAD', mode: 'no-cors' })
                .then(function(resp) {
                    return resp && (resp.ok || resp.type === 'opaque');
                })
                .catch(function(err) {
                    console.warn('[conn test failure]:', err);
                });
        },
    },
    mounted() {
        this.$i18n.locale = localStorage.getItem('lang') == 'hi' ? 'hi' : 'en';
        this.$vuetify.theme.dark =
            localStorage.getItem('dark') == 'true' ? true : false;
        window.addEventListener('online', this.handleConnection, false);
        window.addEventListener('offline', this.handleConnection, false);
    },
    beforeDestroy() {
        window.removeEventListener('online', this.handleConnection, false);
        window.removeEventListener('offline', this.handleConnection, false);
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
