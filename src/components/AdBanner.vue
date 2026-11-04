<template>
  <div
    v-if="config"
    class="ad-banner"
  >
    <ins
      class="adsbygoogle"
      data-ad-format="auto"
      :data-ad-client="config.client"
      :data-ad-slot="config.slot"
      data-full-width-responsive="true"
      style="display: block"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { adsConfig, loadAdSense, requestAd } from '@/services/ads';

// The only place an ad is requested: each mount is a fresh <ins> and one push.
// An ad that can't load leaves nothing on screen and never breaks the page.
const config = adsConfig();

onMounted(() => {
  if (!config) return;
  try {
    loadAdSense(config.client);
    requestAd();
  } catch {
    // Ignored: the ad is optional.
  }
});
</script>

<style scoped>
.ad-banner {
  margin: 8px 32px 0;
}
ins.adsbygoogle[data-ad-status="unfilled"] {
  display: none !important;
}
</style>
