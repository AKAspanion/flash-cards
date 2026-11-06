import { expect, test, type Page } from '@playwright/test';
import { signUp } from './helpers';
import { DEV_PORTS } from '../../dev-ports';

const AUTH = `http://127.0.0.1:${DEV_PORTS.auth}`;
const PROJECT = 'demo-flash-cards';

const BANNER_TEXT = 'Verify your email to keep your account safe.';
const HOME_EMPTY = 'Welcome to your flashcards library!';
const DISMISS_PREFIX = 'flashcards.verifyBannerDismissedAt.';
const DAY = 86_400_000;

function verifyBanner(page: Page) {
  // The banner is a region named by its own text (no live region: its Resend countdown ticks every second).
  return page.getByRole('region', { name: BANNER_TEXT });
}

/** The newest verify-email link the Auth emulator holds for `email` (the emulator needs no auth header here). */
async function verifyLinkFor(page: Page, email: string): Promise<string> {
  const response = await page.request.get(`${AUTH}/emulator/v1/projects/${PROJECT}/oobCodes`);
  expect(response.ok()).toBe(true);
  const { oobCodes } = (await response.json()) as { oobCodes: { email: string; requestType: string; oobLink: string }[] };
  const link = oobCodes.filter((c) => c.email === email && c.requestType === 'VERIFY_EMAIL').at(-1)?.oobLink;
  if (!link) {
    throw new Error(`No verify-email code for ${email}`);
  }
  return link;
}

/** Every verify-banner dismissal this browser holds, by key. */
async function storedDismissals(page: Page): Promise<Record<string, string>> {
  return page.evaluate((prefix) => {
    const found: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)!;
      if (key.startsWith(prefix)) {
        found[key] = localStorage.getItem(key)!;
      }
    }
    return found;
  }, DISMISS_PREFIX);
}

test("Home offers Resend email and Dismiss; /profile offers I've verified until the email is verified", async ({ page }) => {
  const email = await signUp(page);
  await expect(page.getByText('Account created. Check your inbox to verify your email.')).toBeVisible();

  const banner = verifyBanner(page);
  await expect(banner).toBeVisible();
  await expect(banner.getByRole('button', { name: 'Resend email' })).toBeVisible();
  await expect(banner.getByRole('button', { name: 'Dismiss' })).toBeVisible();
  await expect(banner.getByRole('button', { name: "I've verified" })).toHaveCount(0);

  await page.goto('/profile');
  await expect(banner).toBeVisible();
  await expect(banner.getByRole('button', { name: 'Dismiss' })).toHaveCount(0);

  await banner.getByRole('button', { name: "I've verified" }).click();
  await expect(page.getByText('Not verified yet. Open the link in the email first.')).toBeVisible();
  await expect(banner).toBeVisible();

  const opened = await page.request.get(await verifyLinkFor(page, email));
  expect(opened.ok()).toBe(true);

  await banner.getByRole('button', { name: "I've verified" }).click();
  await expect(page.getByText('Email verified.', { exact: true })).toBeVisible();
  await expect(banner).toHaveCount(0);

  await page.goto('/home');
  await expect(page.getByText(HOME_EMPTY)).toBeVisible();
  await expect(verifyBanner(page)).toHaveCount(0);
});

test('Dismiss hides the banner on Home for 7 days, while /profile keeps it', async ({ page }) => {
  await signUp(page);
  const banner = verifyBanner(page);
  await banner.getByRole('button', { name: 'Dismiss' }).click();
  await expect(banner).toHaveCount(0);
  // Not verified: the quiet check says nothing, and the dismissal is kept.
  await expect(page.getByText('Not verified yet. Open the link in the email first.')).toHaveCount(0);
  await expect.poll(async () => Object.keys(await storedDismissals(page)).length).toBe(1);

  await page.reload();
  await expect(page.getByText(HOME_EMPTY)).toBeVisible();
  await expect(verifyBanner(page)).toHaveCount(0);

  await page.goto('/profile');
  await expect(verifyBanner(page)).toBeVisible();
  await expect(verifyBanner(page).getByRole('button', { name: "I've verified" })).toBeVisible();

  // Eight days on, Home shows it again.
  const [key] = Object.keys(await storedDismissals(page));
  await page.evaluate(([k, at]) => localStorage.setItem(k, at), [key, String(Date.now() - 8 * DAY)]);
  await page.goto('/home');
  await expect(page.getByText(HOME_EMPTY)).toBeVisible();
  await expect(verifyBanner(page)).toBeVisible();
});

test('Dismiss after verifying in another tab marks the email verified and stores nothing', async ({ page }) => {
  const email = await signUp(page);
  await expect(verifyBanner(page)).toBeVisible();
  const opened = await page.request.get(await verifyLinkFor(page, email));
  expect(opened.ok()).toBe(true);

  // Dismiss hides the banner at once and re-checks verification in the background.
  // Wait for that check's lookup to answer, or navigating away would abort it.
  const lookup = page.waitForResponse((r) => r.url().includes('accounts:lookup'));
  await verifyBanner(page).getByRole('button', { name: 'Dismiss' }).click();
  await expect(verifyBanner(page)).toHaveCount(0);
  await lookup;

  await page.goto('/profile');
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  await expect(verifyBanner(page)).toHaveCount(0);
  expect(await storedDismissals(page)).toEqual({});
});

test('offline, Dismiss hides the banner and stores the dismissal without an error', async ({ page, context }) => {
  await signUp(page);
  await expect(verifyBanner(page)).toBeVisible();

  await context.setOffline(true);
  await verifyBanner(page).getByRole('button', { name: 'Dismiss' }).click();
  await expect(verifyBanner(page)).toHaveCount(0);
  await expect(page.getByText("You're offline. Connect to the internet to save.")).toHaveCount(0);
  await expect.poll(async () => Object.keys(await storedDismissals(page)).length).toBe(1);
  await context.setOffline(false);
});

test('no screen but Home and /profile shows the banner', async ({ page }) => {
  await signUp(page);
  await expect(verifyBanner(page)).toBeVisible();
  for (const path of ['/settings', '/stats', '/bin', '/info']) {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    // The Menu button shows once the signed-in user has loaded, when the banner would too.
    await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();
    await expect(verifyBanner(page)).toHaveCount(0);
  }
});

test("another user signing in on this browser still sees the banner after the first user's dismissal", async ({ page }) => {
  await signUp(page);
  await verifyBanner(page).getByRole('button', { name: 'Dismiss' }).click();
  await expect(verifyBanner(page)).toHaveCount(0);
  await expect.poll(async () => Object.keys(await storedDismissals(page)).length).toBe(1);

  await page.goto('/profile');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login/);

  await signUp(page);
  await expect(page.getByText(HOME_EMPTY)).toBeVisible();
  await expect(verifyBanner(page)).toBeVisible();
});

test("the verification email's link continues to the app's home screen", async ({ page }) => {
  const email = await signUp(page);
  await expect(verifyBanner(page)).toBeVisible();

  const link = new URL(await verifyLinkFor(page, email));
  expect(link.searchParams.get('continueUrl')).toBe(`${new URL(page.url()).origin}/home`);
});

test('Resend email sends again and waits before the next send', async ({ page }) => {
  await signUp(page);
  const banner = verifyBanner(page);
  await expect(banner).toBeVisible();

  await banner.getByRole('button', { name: 'Resend email' }).click();
  await expect(page.getByText('Sent. Check your inbox.')).toBeVisible();
  await expect(banner.getByRole('button', { name: /^Resend email/ })).toBeDisabled();
});
