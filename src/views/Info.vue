<template>
    <div>
        <bar-top @click:left="goBack">
            <template #left-button>
                <v-icon size="32" color="primary">mdi-arrow-left</v-icon>
            </template>
            <template #left-text>
                {{ $t('common.home') }}
            </template>
        </bar-top>
    </div>
</template>

<script>
import { navigateToPath } from '@/util';
import BarTop from '@/components/BarTop.vue';
export default {
    name: 'Info',
    components: {
        BarTop,
    },
    methods: {
        goBack() {
            navigateToPath('/home');
        },
    },
};
</script>

<style></style>
