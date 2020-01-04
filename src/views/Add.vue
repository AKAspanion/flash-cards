<template>
    <div class="add-container">
        <bar-top>
            <template #left-button>
                <v-btn icon @click="goBack">
                    <v-icon size="32" color="primary">mdi-arrow-left</v-icon>
                </v-btn>
            </template>
            <template #left-text>
                home
            </template>
            <template #right-button>
                <v-btn icon>
                    <v-icon size="32" color="primary">mdi-dots-vertical</v-icon>
                </v-btn>
            </template>
            <template #right-text>
                options
            </template>
        </bar-top>
        <div class="px-8 pb-6">
            <card-flash></card-flash>
        </div>
    </div>
</template>

<script>
import { navigateToPath } from '@/util';
import BarTop from '@/components/BarTop.vue';
import CardFlash from '@/components/CardFlash.vue';
export default {
    name: 'add',
    components: {
        BarTop,
        CardFlash,
    },
    methods: {
        goBack() {
            navigateToPath('/home');
        },
    },
};
</script>
