export type AdsConfig = { client: string; slot: string };
export const ADSENSE_SCRIPT_URL = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

const CLIENT_PATTERN = /^ca-pub-\d+$/;
const SLOT_PATTERN = /^\d+$/;

let loaded = false;

/** The publisher ID and ad slot, or null when either is unset or malformed, so no ad ever shows. */
export function adsConfig(): AdsConfig | null {
  const client = import.meta.env.VUE_APP_ADSENSE_CLIENT;
  const slot = import.meta.env.VUE_APP_ADSENSE_SLOT;
  if (!client || !slot || !CLIENT_PATTERN.test(client) || !SLOT_PATTERN.test(slot)) return null;
  return { client, slot };
}

/** Appends the AdSense script once per page load; a blocked or failed load is ignored. */
export function loadAdSense(client: string): void {
  if (loaded || !CLIENT_PATTERN.test(client)) return;
  loaded = true;
  const script = document.createElement('script');
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.src = `${ADSENSE_SCRIPT_URL}?client=${client}`;
  script.addEventListener('error', () => {});
  document.head.appendChild(script);
}

/** Asks AdSense to fill the next ad slot; a blocked script or a rejected push is ignored. */
export function requestAd(): void {
  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  } catch {
    // An ad that can't load leaves nothing on screen.
  }
}
