export interface BadgeTarget {
  setAppBadge?: (count?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
}

/** Shows `count` on the installed app's icon, or clears the badge at 0. Does nothing where the Badging API is missing. */
export async function updateAppBadge(
  count: number,
  target: BadgeTarget = navigator as BadgeTarget,
): Promise<void> {
  try {
    if (count > 0) {
      await target.setAppBadge?.(count);
    } else {
      await target.clearAppBadge?.();
    }
  } catch {
    // An unsupported or refused badge is cosmetic: never surface it.
  }
}
