export const BOOT_SPLASH_ID = 'boot-splash';
export const BOOT_SPLASH_FADE_MS = 300;
export const BOOT_SPLASH_REMOVE_MS = 400;

const HIDING_CLASS = 'boot-splash--hiding';

/** Fades out and removes the #boot-splash overlay. Safe to call more than once, or with no overlay. */
export function hideBootSplash(doc: Document = document): void {
  const el = doc.getElementById(BOOT_SPLASH_ID);
  if (!el || el.classList.contains(HIDING_CLASS)) return;
  el.style.pointerEvents = 'none';
  el.classList.add(HIDING_CLASS);
  const remove = () => el.remove();
  el.addEventListener('transitionend', remove, { once: true });
  setTimeout(remove, BOOT_SPLASH_REMOVE_MS);
}
