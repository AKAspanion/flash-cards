<template>
    <div class="d-flex align-center justify-center fill-height">
        <div class="text-center">
            <v-icon size="120">{{ icon }}</v-icon>
            <div class="subtitle py-6">{{ title }}</div>
        </div>
    </div>
</template>

<script>
export default {
    props: ['icon', 'title'],
};
</script>

<style></style>
