import { expect, test, type Page } from '@playwright/test';
import { signUp } from './helpers';
import { DEV_PORTS } from '../../dev-ports';

const AUTH = `http://127.0.0.1:${DEV_PORTS.auth}`;
const PROJECT = 'demo-flash-cards';

const BANNER_TEXT = 'Verify your email to keep your account safe.';
const HOME_EMPTY = 'Welcome to your flashcards library!';

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

test('the banner stays until the email is verified, then goes for good', async ({ page }) => {
  const email = await signUp(page);
  await expect(page.getByText('Account created. Check your inbox to verify your email.')).toBeVisible();

  const banner = verifyBanner(page);
  await expect(banner).toBeVisible();

  await banner.getByRole('button', { name: "I've verified" }).click();
  await expect(page.getByText('Not verified yet. Open the link in the email first.')).toBeVisible();
  await expect(banner).toBeVisible();

  const opened = await page.request.get(await verifyLinkFor(page, email));
  expect(opened.ok()).toBe(true);

  await banner.getByRole('button', { name: "I've verified" }).click();
  await expect(page.getByText('Email verified.', { exact: true })).toBeVisible();
  await expect(banner).toHaveCount(0);

  await page.reload();
  await expect(page.getByText(HOME_EMPTY)).toBeVisible();
  await expect(verifyBanner(page)).toHaveCount(0);
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
