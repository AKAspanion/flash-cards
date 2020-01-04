<template>
    <div class="action-button">
        <v-btn v-bind="$attrs" height="48" width="150" @click="$emit('click')">
            <slot></slot>
        </v-btn>
    </div>
</template>

<script>
export default {};
</script>

<style scoped>
.action-button {
    left: 50vw;
    width: 150px;
    bottom: 36px;
    position: fixed;
    transform: translate3d(-50%, 0, 0);
}
</style>
