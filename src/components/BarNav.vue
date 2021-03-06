<template>
    <v-fab-transition>
        <v-speed-dial
            right
            fixed
            bottom
            direction="top"
            v-if="showBarNav"
            v-model="navModel"
            transition="slide-y-reverse-transition"
        >
            <template #activator>
                <v-btn
                    :class="loading ? 'elevation-0' : ''"
                    :disabled="loading"
                    v-model="navModel"
                    color="primary"
                    fab
                >
                    <v-icon
                        :class="
                            navModel ? 'rotated-fab' : 'rotated-fab--active'
                        "
                    >
                        mdi-chevron-left
                    </v-icon>
                </v-btn>
            </template>
            <v-btn
                fab
                small
                color="accent"
                :key="action.id"
                :disabled="loading"
                @click="onActionClick(action)"
                v-for="action in loading ? [] : actionButtons"
            >
                <v-icon small>{{ action.icon }}</v-icon>
                <div class="fab--tooltip">{{ action.title }}</div>
            </v-btn>
        </v-speed-dial>
    </v-fab-transition>
</template>

<script>
import { navigateToPath } from '@/util';
export default {
    data() {
        return {
            navModel: false,
            invisibleRoutes: ['login', 'profile', 'view'],
        };
    },
    computed: {
        loading() {
            return this.appLoading || this.authLoading;
        },
        authLoading() {
            return this.$store.getters.authLoading;
        },
        appLoading() {
            return this.$store.getters.loading;
        },
        currentUser() {
            return this.$store.getters.user;
        },
        showBarNav() {
            return !this.invisibleRoutes.includes(this.$route.name);
        },
        actionButtons() {
            return [
                {
                    title: this.$t('common.home'),
                    icon: 'mdi-home',
                    path: '/home',
                    id: 1,
                },
                {
                    title: this.$t('home.set.add'),
                    icon: 'mdi-card-plus',
                    path: '/add',
                    id: 2,
                },
                // {
                //     icon: 'mdi-folder',
                //     title: 'manage folders',
                //     path: '/folder',
                //     id: 3,
                // },
            ];
        },
    },
    watch: {
        $route: {
            handler(r) {
                this.navModel = false;
            },
        },
    },
    methods: {
        onActionClick(action) {
            navigateToPath(action.path);
        },
    },
};
</script>

<style scoped>
.rotated-fab {
    transform: rotate(90deg);
    transition: transform 0.2s cubic-bezier(1, 0, 0, 1);
}
.rotated-fab--active {
    transform: rotate(40deg);
}
.fab--tooltip {
    position: absolute;
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    right: calc(100% + 8px);
    background: rgba(0, 0, 0, 0.56);
}
</style>
