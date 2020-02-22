<template>
    <div class="px-4 py-2">
        <v-toolbar flat height="120">
            <div class="avatar-container">
                <v-btn icon width="64" height="64" @click="$emit('click:left')">
                    <slot name="left-button"></slot>
                </v-btn>
                <div class="avatar-text overline">
                    <slot name="left-text"></slot>
                </div>
            </div>
            <div class="center-slot">
                <slot name="center"></slot>
            </div>
            <div class="avatar-container">
                <v-btn
                    icon
                    width="64"
                    height="64"
                    @click="$emit('click:right')"
                >
                    <slot name="right-button"></slot>
                </v-btn>
                <div class="avatar-text overline">
                    <slot name="right-text"></slot>
                </div>
            </div>
        </v-toolbar>
        <slot></slot>
    </div>
</template>

<script>
export default {};
</script>

<style scoped>
.center-slot {
    overflow: hidden;
    max-height: 120px;
    width: calc(100% - 128px);
}
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
