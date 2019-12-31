<template>
    <v-card class="round-card" v-bind="$attrs">
        <slot></slot>
    </v-card>
</template>

<script>
export default {
    name: 'RCard',
};
</script>

<style scoped>
.round-card {
    border-radius: 24px !important;
}
</style>
