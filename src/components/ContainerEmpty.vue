<template>
    <div class="d-flex align-center justify-center fill-height">
        <div class="text-center mb-12 pb-6">
            <v-icon size="150">{{ icon }}</v-icon>
            <slot></slot>
        </div>
    </div>
</template>

<script>
export default {
    props: ['icon', 'title'],
};
</script>

<style></style>
