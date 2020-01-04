<template>
    <v-speed-dial
        bottom
        right
        fixed
        direction="top"
        v-if="showBarNav"
        v-model="navModel"
        transition="slide-y-reverse-transition"
    >
        <template #activator>
            <v-btn v-model="navModel" dark fab color="primary">
                <v-icon
                    :class="navModel ? 'rotated-fab' : 'rotated-fab--active'"
                >
                    mdi-chevron-left
                </v-icon>
            </v-btn>
        </template>
        <v-btn
            fab
            dark
            small
            color="accent"
            :key="action.id"
            @click="onActionClick(action)"
            v-for="action in actionButtons"
        >
            <v-icon small>{{ action.icon }}</v-icon>
            <div class="fab--tooltip">{{ action.title }}</div>
        </v-btn>
    </v-speed-dial>
</template>

<script>
import { navigateToPath } from '@/util';
export default {
    data() {
        return {
            actionButtons: [
                {
                    icon: 'mdi-home',
                    title: 'home',
                    path: '/home',
                    id: 1,
                },
                {
                    icon: 'mdi-card-plus',
                    title: 'add card set',
                    path: '/add',
                    id: 2,
                },
                // {
                //     icon: 'mdi-folder',
                //     title: 'manage folders',
                //     path: '/folder',
                //     id: 3,
                // },
            ],
            navModel: false,
        };
    },
    computed: {
        currentUser() {
            return this.$store.getters.user;
        },
        showBarNav() {
            return this.$route.name !== 'login';
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
