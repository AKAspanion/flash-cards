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
            <v-card raised dark height="30vh">
                <v-card color="primary" height="20vh" class="pa-6">
                    hey
                </v-card>
                <div class="d-flex align-center px-6 py-5" >
                    <div>
                        <div class="grey--text overline">learned</div>
                        <div class="caption">100%</div>
                    </div>
                    <v-spacer></v-spacer>
                    <v-chip small class="primary" outlined>browse</v-chip>
                </div>
            </v-card>
        </div>
    </div>
</template>

<script>
export default {
    name: 'home',
    components: {
    },
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
