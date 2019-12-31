<template>
    <v-bottom-navigation
        grow
        shift
        absolute
        color="primary"
        v-model="navBar"
        v-if="showBarNav"
    >
        <v-btn value="home" @click="navigateTo('/home')">
            <span>Home</span>
            <v-icon>mdi-book-open-variant</v-icon>
        </v-btn>
        <v-btn value="add" @click="navigateTo('/add')">
            <span>Add</span>
            <v-icon>mdi-plus</v-icon>
        </v-btn>
        <v-btn value="folder" @click="navigateTo('/folder')">
            <span>Folder</span>
            <v-icon>mdi-folder</v-icon>
        </v-btn>
    </v-bottom-navigation>
</template>

<script>
import { navigateToPath } from '@/util';
export default {
    data() {
        return {
            navBar: 'home',
            is404: false,
        };
    },
    computed: {
        currentUser() {
            return this.$store.getters.user;
        },
        showBarNav() {
            return this.$store.getters.barNav;
        },
    },
    methods: {
        navigateTo(path) {
            navigateToPath(path);
        },
    },
    mounted() {
        this.$router.afterEach((to, from) => {
            this.navBar = to.name ? to.name : 'home';
        });
    },
};
</script>

<style></style>
