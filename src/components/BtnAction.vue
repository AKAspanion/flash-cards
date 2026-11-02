<template>
  <div class="action-button">
    <v-btn
      height="48"
      rounded="xl"
      width="150"
      v-bind="$attrs"
    >
      <slot />
    </v-btn>
  </div>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false });
</script>

<style scoped>
.action-button {
  position: fixed;
  bottom: 36px;
  left: 50vw;
  z-index: 5;
  width: 150px;
  transform: translate3d(-50%, 0, 0);
}
</style>
