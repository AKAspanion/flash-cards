<template>
    <div class="px-4 py-2">
        <v-toolbar flat height="120">
            <div class="avatar-container">
                <slot name="left-button"></slot>
                <div class="avatar-text overline">
                    <slot name="left-text"></slot>
                </div>
            </div>
            <v-spacer></v-spacer>
            <div class="avatar-container">
                <slot name="right-button"></slot>
                <div class="avatar-text overline">
                    <slot name="right-text"></slot>
                </div>
            </div>
        </v-toolbar>
    </div>
</template>

<script>
export default {};
</script>

<style scoped>
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
