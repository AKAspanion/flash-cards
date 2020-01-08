<template>
    <div class="d-flex align-center justify-center fill-height px-8">
        <div class="text-center mb-12 pb-6">
            <v-icon color="primary" size="150">{{ icon }}</v-icon>
            <div class="title">
                {{ title }}
            </div>
            <div class="subtitle-2 my-1 pb-6">
                {{ subtitle }}
            </div>
            <slot></slot>
        </div>
    </div>
</template>

<script>
export default {
    props: ['icon', 'title', 'subtitle'],
};
</script>

<style></style>
