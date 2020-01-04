<template>
    <div class="profile-container">
        <bar-top @click:left="goBack">
            <template #left-button>
                <v-icon size="32" color="primary">mdi-arrow-left</v-icon>
            </template>
            <template #left-text>
                home
            </template>
        </bar-top>
        <div class="px-8 pb-8">
            <v-avatar
                size="72"
                class="ml-n1"
                :color="!$vuetify.theme.dark ? 'white' : '#404040'"
            >
                <template v-if="currentUser.photoURL">
                    <v-img :src="currentUser.photoURL"></v-img>
                </template>
                <template v-else>
                    <div
                        v-if="currentUser.displayName"
                        class="display-1 font-weight-medium"
                    >
                        {{ getInitials(currentUser.displayName) }}
                    </div>
                    <v-icon v-else size="72" color="primary">mdi-face</v-icon>
                </template>
            </v-avatar>
            <div class="text-lowercase title profile-text">
                {{ currentUser.displayName || 'ankit pandit' }}
            </div>
            <div class="text-lowercase caption profile-text">
                {{ currentUser.email || 'na' }}
            </div>
        </div>
        <v-card
            flat
            color="#f5f5f5"
            class="pa-8 mb-n6 profile-card"
            min-height="calc(100vh - 292px)"
        >
            <div class="d-flex align-start pb-8">
                <v-icon>mdi-calendar</v-icon>
                <div class="px-8">
                    <div class="caption">member since</div>
                    <div class="subtitle-2">
                        {{ currentUser.userSince.slice(0, 16) }}
                    </div>
                </div>
            </div>
            <div class="d-flex align-start">
                <v-icon>mdi-label</v-icon>
                <div class="px-8">
                    <div class="caption">your labels</div>
                    <div class="subtitle-2">
                        {{ currentUser.userSince.slice(0, 16) }}
                    </div>
                </div>
            </div>
        </v-card>
    </div>
</template>

<script>
import { navigateToPath, getInitials } from '@/util';
import BarTop from '@/components/BarTop.vue';
export default {
    name: 'Profile',
    components: { BarTop },
    computed: {
        currentUser() {
            return this.$store.getters.user;
        },
    },
    methods: {
        goBack() {
            navigateToPath('/home');
        },
        getInitials(name) {
            getInitials(name);
        },
    },
};
</script>

<style scoped>
.profile-text {
    padding-left: 2px;
}
.profile-card {
    border-bottom-right-radius: 0px !important;
    border-bottom-left-radius: 0px !important;
}
</style>