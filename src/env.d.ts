/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  readonly VUE_APP_API_KEY?: string;
  readonly VUE_APP_AUTH_DOMAIN?: string;
  readonly VUE_APP_DATABASE_URL?: string;
  readonly VUE_APP_PROJECT_ID?: string;
  readonly VUE_APP_STORAGE_BUCKET?: string;
  readonly VUE_APP_MESSAGING_SENDER_ID?: string;
  readonly VUE_APP_APP_ID?: string;
  readonly VUE_APP_MEASUREMENT_ID?: string;
  /** Google Play listing for the Android (TWA) build; the About page hides Play links when unset. */
  readonly VUE_APP_PLAY_STORE_URL?: string;
  /** "true" connects to the local Auth and Firestore emulators (see `npm run emulators`). */
  readonly VUE_APP_USE_EMULATORS?: string;
  /** Google AdSense publisher ID (`ca-pub-` and digits); no ads when unset or malformed. */
  readonly VUE_APP_ADSENSE_CLIENT?: string;
  /** AdSense display unit's `data-ad-slot` (digits); no ads when unset or malformed. */
  readonly VUE_APP_ADSENSE_SLOT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
