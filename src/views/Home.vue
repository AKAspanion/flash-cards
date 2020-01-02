<template>
    <div class="home">
        <div class="px-5 py-2">
            <v-toolbar flat height="120">
                <div class="avatar-container">
                    <v-btn icon>
                        <v-avatar v-if="currentUser.photoURL" size="24">
                            <v-img :src="currentUser.photoURL"></v-img>
                        </v-avatar>
                        <v-icon v-else size="32" color="primary"
                            >mdi-face
                        </v-icon>
                    </v-btn>
                    <div class="avatar-text overline">
                        {{ currentUser.email }}
                    </div>
                </div>
                <v-spacer></v-spacer>
                <div class="avatar-container">
                    <v-btn icon>
                        <v-icon size="32" color="primary">mdi-settings</v-icon>
                    </v-btn>
                    <div class="avatar-text overline">
                        settings
                    </div>
                </div>
            </v-toolbar>
        </div>
        <div class="px-8">
            <flash-set-card></flash-set-card>
            <option-panel></option-panel>
        </div>
    </div>
</template>

<script>
import FlashSetCard from '@/components/FlashSetCard.vue';
import OptionPanel from '@/components/OptionPanel.vue';
export default {
    name: 'home',
    components: { FlashSetCard, OptionPanel },
    computed: {
        currentUser() {
            return this.$store.getters.user;
        },
    },
};
</script>
<style>
.avatar-container {
    min-width: 64px;
    text-align: center;
}
.avatar-text {
    max-width: 64px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
</style>
