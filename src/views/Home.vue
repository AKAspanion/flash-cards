<template>
    <div class="home-container">
        <bar-top>
            <template #left-button>
                <v-btn icon>
                    <v-avatar v-if="currentUser.photoURL" size="24">
                        <v-img :src="currentUser.photoURL"></v-img>
                    </v-avatar>
                    <v-icon v-else size="32" color="primary"
                        >mdi-face
                    </v-icon>
                </v-btn>
            </template>            
            <template #left-text>
                {{currentUser.email}}
            </template>
            <template #right-button>
                <v-btn icon>
                    <v-icon size="32" color="primary">mdi-settings</v-icon>
                </v-btn>
            </template>
            <template #right-text>
                settings
            </template>
        </bar-top>
        <div class="px-8">
            <card-flash-set></card-flash-set>
            <option-panel></option-panel>
        </div>
    </div>
</template>

<script>
import BarTop from '@/components/BarTop.vue';
import CardFlashSet from '@/components/CardFlashSet.vue';
import OptionPanel from '@/components/OptionPanel.vue';
export default {
    name: 'home',
    components: { BarTop, CardFlashSet, OptionPanel },
    computed: {
        currentUser() {
            return this.$store.getters.user;
        },
    },
};
</script>
<style>
.home-container{
    min-height: 100vh;
}
</style>
