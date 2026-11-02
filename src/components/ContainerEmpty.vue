<template>
  <div class="d-flex align-center justify-center fill-height px-8">
    <div class="text-center mb-12 pb-6">
      <v-icon
        color="primary"
        size="150"
      >
        {{ icon }}
      </v-icon>
      <div class="text-title-large">
        {{ title }}
      </div>
      <div class="text-title-small my-1 pb-6">
        {{ subtitle }}
      </div>
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ icon: string; title: string; subtitle: string }>();
</script>
